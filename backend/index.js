/**
 * Pixelcraft backend (Node.js, no deps).
 *
 * - AI proxy: owns AI API keys via environment variables (backend/.env).
 * - OAuth 2.0 + PKCE exchange: owns OAuth client IDs/secrets and verifies
 *   provider ID tokens before returning a normalized identity to the browser.
 */

import http from 'node:http'
import crypto from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// --- env loading (dotenv-lite, no deps) ---
function loadEnv(file) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...rest] = t.split('=')
    const v = rest.join('=').replace(/^["']|["']$/g, '')
    if (!process.env[k]) process.env[k.trim()] = v
  }
}
loadEnv(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'))

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 3001)
const HOST = process.env.HOST || '0.0.0.0'
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
// Cross-origin frontends (VITE_API_BASE_URL) need cross-origin responses;
// same-origin /api rewrites can keep the stricter default.
const CORP = process.env.CROSS_ORIGIN_RESOURCE_POLICY || 'same-origin'
const APP_URL = (process.env.APP_URL || ALLOWED_ORIGIN).replace(/\/$/, '')
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || `${APP_URL}/auth/callback`

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  Vary: 'Origin',
}

// --- SECURITY: headers ---
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), fullscreen=()',
  'Cross-Origin-Resource-Policy': CORP,
}

// --- SECURITY: simple per-IP rate limiter ---
const rateBuckets = new Map()
function checkRateLimit(req, res) {
  const ip = req.socket?.remoteAddress || 'unknown'
  const now = Date.now()
  const win = 60_000
  const limit = 30 // requests / 60s
  let bucket = rateBuckets.get(ip)
  if (!bucket || now - bucket.start > win) {
    bucket = { start: now, count: 0 }
    rateBuckets.set(ip, bucket)
  }
  bucket.count++
  if (bucket.count > limit) {
    res.writeHead(429, {
      ...SECURITY_HEADERS,
      'Retry-After': String(Math.ceil((win - (now - bucket.start)) / 1000)),
    })
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }))
    return false
  }
  return true
}

// --- SECURITY: body size limits ---
const MAX_BODY = 10 * 1024 * 1024
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        req.destroy()
        reject(new Error('body_too_large'))
      } else chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => reject(new Error('read_error')))
  })
}

// --- SECURITY: strip prototype pollution keys from JSON bodies ---
function sanitizeObj(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const out = {}
  for (const key of Object.keys(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    out[key] = sanitizeObj(value[key])
  }
  return out
}

const json = (res, code, body) => {
  res.writeHead(code, { ...SECURITY_HEADERS, ...CORS, 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

// ---------------------------------------------------------------------------
// OAuth 2.0 + PKCE
// ---------------------------------------------------------------------------

const OAUTH_PROVIDERS = ['google', 'apple', 'microsoft']
const jwksCache = new Map()
let appleSecretCache = { value: '', expiresAt: 0 }

function base64Url(input) {
  return Buffer.from(input).toString('base64url')
}

function decodeBase64Url(value) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function applePrivateKey() {
  let key = ''
  if (process.env.APPLE_PRIVATE_KEY_FILE && existsSync(process.env.APPLE_PRIVATE_KEY_FILE)) {
    key = readFileSync(process.env.APPLE_PRIVATE_KEY_FILE, 'utf8')
  } else {
    key = process.env.APPLE_PRIVATE_KEY || ''
  }
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key
}

function getAppleClientSecret() {
  if (appleSecretCache.value && Date.now() < appleSecretCache.expiresAt) return appleSecretCache.value
  const teamId = process.env.APPLE_TEAM_ID
  const keyId = process.env.APPLE_KEY_ID
  const clientId = process.env.APPLE_CLIENT_ID
  const key = applePrivateKey()
  if (!teamId || !keyId || !clientId || !key) throw new Error('Apple OAuth is not fully configured.')

  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const payload = base64Url(JSON.stringify({
    iss: teamId,
    iat: now,
    exp: now + 300,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  }))
  const signingInput = `${header}.${payload}`
  const signature = crypto.sign(
    'sha256',
    Buffer.from(signingInput),
    { key, dsaEncoding: 'ieee-p1363' },
  )
  appleSecretCache = {
    value: `${signingInput}.${signature.toString('base64url')}`,
    expiresAt: Date.now() + 240_000,
  }
  return appleSecretCache.value
}

function getProviderConfig(provider) {
  if (provider === 'google') {
    if (!process.env.GOOGLE_CLIENT_ID) return null
    return {
      label: 'Google',
      authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
      jwks: 'https://www.googleapis.com/oauth2/v3/certs',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      scope: 'openid email profile',
      extra: { prompt: 'select_account', access_type: 'online' },
      issuer: 'https://accounts.google.com',
    }
  }
  if (provider === 'microsoft') {
    if (!process.env.MICROSOFT_CLIENT_ID) return null
    const tenant = process.env.MICROSOFT_TENANT || 'common'
    return {
      label: 'Microsoft',
      authorize: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      jwks: `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`,
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      scope: 'openid email profile',
      extra: { prompt: 'select_account' },
      microsoft: true,
    }
  }
  if (provider === 'apple') {
    if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID) return null
    if (!process.env.APPLE_PRIVATE_KEY && !process.env.APPLE_PRIVATE_KEY_FILE) return null
    return {
      label: 'Apple',
      authorize: 'https://appleid.apple.com/auth/authorize',
      token: 'https://appleid.apple.com/auth/token',
      jwks: 'https://appleid.apple.com/auth/keys',
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: '', // generated on demand
      scope: 'name email',
      extra: { response_mode: 'query' },
      issuer: 'https://appleid.apple.com',
      apple: true,
    }
  }
  return null
}

function publicOAuthConfig() {
  const providers = {}
  for (const provider of OAUTH_PROVIDERS) {
    const config = getProviderConfig(provider)
    providers[provider] = config
      ? {
          enabled: true,
          label: config.label,
          authorize: config.authorize,
          clientId: config.clientId,
          scope: config.scope,
          extra: config.extra || {},
        }
      : { enabled: false, label: provider[0].toUpperCase() + provider.slice(1) }
  }
  return { redirectUri: OAUTH_REDIRECT_URI, providers }
}

async function getJwks(url) {
  const cached = jwksCache.get(url)
  if (cached && Date.now() - cached.fetchedAt < 3_600_000) return cached.keys
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load provider signing keys.')
  const data = await response.json().catch(() => ({}))
  if (!Array.isArray(data.keys)) throw new Error('Provider signing keys were invalid.')
  jwksCache.set(url, { fetchedAt: Date.now(), keys: data.keys })
  return data.keys
}

async function verifyIdToken(idToken, config, nonce) {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('Invalid provider token.')
  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8'))
  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'))

  const algorithm = header.alg === 'RS256' ? 'sha256' : header.alg === 'ES256' ? 'sha256' : null
  if (!algorithm) throw new Error('Unsupported provider token signature.')

  const keys = await getJwks(config.jwks)
  const jwk = keys.find((key) => key.kid === header.kid) || keys.find((key) => key.alg === header.alg)
  if (!jwk) throw new Error('Provider signing key not found.')

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const verifyOptions = header.alg === 'ES256'
    ? { key: publicKey, dsaEncoding: 'ieee-p1363' }
    : { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }
  const valid = crypto.verify(
    algorithm,
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    verifyOptions,
    Buffer.from(encodedSignature, 'base64url'),
  )
  if (!valid) throw new Error('Provider token signature is invalid.')

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp <= now) throw new Error('Provider token has expired.')
  if (payload.aud !== config.clientId) throw new Error('Provider token has the wrong audience.')

  if (config.microsoft) {
    if (!payload.tid || !payload.iss?.startsWith('https://login.microsoftonline.com/')) {
      throw new Error('Provider token has the wrong issuer.')
    }
    if (payload.iss !== `https://login.microsoftonline.com/${payload.tid}/v2.0`) {
      throw new Error('Provider token has the wrong issuer.')
    }
  } else if (config.issuer && payload.iss !== config.issuer) {
    throw new Error('Provider token has the wrong issuer.')
  }

  if (nonce && payload.nonce !== nonce) throw new Error('Sign-in nonce did not match.')
  return payload
}

async function handleOAuthExchange(req, res, rawBody) {
  let body
  try {
    body = sanitizeObj(JSON.parse(rawBody || '{}'))
  } catch {
    return json(res, 400, { error: 'Invalid request body.' })
  }

  const provider = String(body.provider || '').toLowerCase()
  const code = typeof body.code === 'string' ? body.code : ''
  const codeVerifier = typeof body.codeVerifier === 'string' ? body.codeVerifier : ''
  const nonce = typeof body.nonce === 'string' ? body.nonce : ''
  const redirectUri = typeof body.redirectUri === 'string' ? body.redirectUri : ''

  if (!OAUTH_PROVIDERS.includes(provider)) return json(res, 400, { error: 'Unknown sign-in provider.' })
  const config = getProviderConfig(provider)
  if (!config) {
    return json(res, 503, {
      error: `${config?.label || provider} sign-in is not configured. Add its credentials to backend/.env.`,
    })
  }
  if (!code || !codeVerifier || !nonce || !redirectUri) {
    return json(res, 400, { error: 'Missing OAuth exchange parameters.' })
  }
  if (redirectUri !== OAUTH_REDIRECT_URI) {
    return json(res, 400, { error: 'Redirect URI does not match server configuration.' })
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      code_verifier: codeVerifier,
    })
    const secret = config.apple ? getAppleClientSecret() : config.clientSecret
    if (secret) params.set('client_secret', secret)

    const tokenResponse = await fetch(config.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const tokens = await tokenResponse.json().catch(() => ({}))
    if (!tokenResponse.ok || !tokens.id_token) {
      return json(res, 400, {
        error: tokens.error_description || tokens.error || `Provider rejected the sign-in (${tokenResponse.status}).`,
      })
    }

    const profile = await verifyIdToken(tokens.id_token, config, nonce)
    let email = String(profile.email || profile.upn || profile.preferred_username || '').toLowerCase()
    let name = String(profile.name || '').trim()
    if (config.apple && body.user && typeof body.user === 'object') {
      const appleEmail = String(body.user.email || '').trim().toLowerCase()
      const appleName = [body.user.name?.firstName, body.user.name?.lastName].filter(Boolean).join(' ').trim()
      if (appleEmail) email = appleEmail
      if (appleName) name = appleName
    }
    if (!email) return json(res, 400, { error: 'Provider did not return an email address.' })
    if (!name) name = email.split('@')[0]

    const verified = profile.email_verified === true || profile.email_verified === 'true'
      || (config.microsoft && profile.email_verified === undefined)
      || (config.apple && !!body.user?.email)
    if (!verified) return json(res, 403, { error: 'Please verify your email with the provider before signing in.' })

    return json(res, 200, {
      provider,
      providerUserId: String(profile.sub || ''),
      email,
      name: name.slice(0, 120),
    })
  } catch (error) {
    return json(res, 400, { error: (error && error.message) || 'Sign-in with provider failed.' })
  }
}

// ---------------------------------------------------------------------------
// AI proxy (keys stay on the server)
// ---------------------------------------------------------------------------

async function requireAuthHeader(req, res) {
  const header = req.headers.authorization
  if (!header || typeof header !== 'string') {
    json(res, 401, { error: 'Missing Authorization header.' })
    return false
  }
  return true
}

async function handleChat(req, res, body) {
  const data = sanitizeObj(JSON.parse(body))
  const { provider, model, messages } = data
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: 'Messages are required.' })
  }
  const key = provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY
  if (!key) return json(res, 503, { error: 'AI provider not configured: set OPENAI_API_KEY (or ANTHROPIC_API_KEY) in backend/.env' })
  const url = provider === 'anthropic' ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions'
  const payload = provider === 'anthropic'
    ? {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: messages.find((m) => m.role === 'system')?.content,
        messages: messages.filter((m) => m.role !== 'system'),
      }
    : { model: model || 'gpt-4o-mini', messages }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  })
  const output = await response.json().catch(() => ({}))
  const message = provider === 'anthropic'
    ? output.content?.[0]?.text || ''
    : output.choices?.[0]?.message?.content || output.error?.message || ''
  if (!response.ok) return json(res, response.status, { error: message || `Upstream error (${response.status})` })
  json(res, 200, { message })
}

async function handleImage(req, res, body) {
  const data = sanitizeObj(JSON.parse(body))
  const { model, prompt, negativePrompt, aspect, style } = data
  const key = process.env.OPENAI_API_KEY
  if (!key) return json(res, 503, { error: 'Set OPENAI_API_KEY in backend/.env to generate images.' })
  if (!prompt || typeof prompt !== 'string') return json(res, 400, { error: 'Prompt is required.' })
  const size = aspect === '9:16' ? '1024x1792' : aspect === '4:5' ? '1152x1440' : aspect === '16:9' ? '1792x1024' : '1024x1024'
  const fullPrompt = [style ? `style: ${style}` : '', negativePrompt ? `avoid: ${negativePrompt}` : '', prompt]
    .filter(Boolean)
    .join(' — ')
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model || 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size,
      response_format: 'b64_json',
      quality: 'standard',
    }),
  })
  const output = await response.json().catch(() => ({}))
  if (!response.ok || !output.data?.[0]?.b64_json) {
    return json(res, response.status || 500, { error: output.error?.message || 'Image generation failed' })
  }
  json(res, 200, { url: `data:image/png;base64,${output.data[0].b64_json}` })
}

function parseMultipart(body, boundary) {
  const out = []
  for (const part of body.toString('binary').split(`--${boundary}`)) {
    if (!part || part === '--' || part === '--\r\n') continue
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd < 0) continue
    const headers = part.slice(0, headerEnd)
    const data = part.slice(headerEnd + 4).replace(/\r\n$/, '')
    const nameMatch = headers.match(/name="([^"]+)"/)
    const fileMatch = headers.match(/filename="([^"]*)"/)
    const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i)
    if (!nameMatch) continue
    out.push({
      name: nameMatch[1],
      filename: fileMatch?.[1],
      type: typeMatch?.[1],
      buffer: Buffer.from(data, 'binary'),
    })
  }
  return out
}

async function handleTranscribe(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)
  if (body.length > MAX_BODY) return { status: 413, error: 'Audio too large' }
  const boundary = (req.headers['content-type'] || '').match(/boundary=(.+)$/)?.[1]
  if (!boundary) return { status: 400, error: 'Invalid multipart request' }
  const parsed = parseMultipart(body, boundary)
  const key = process.env.OPENAI_API_KEY
  if (!key) return { status: 503, error: 'Set OPENAI_API_KEY in backend/.env to transcribe.' }
  const fileEntry = parsed.find((part) => part.name === 'file')
  if (!fileEntry) return { status: 400, error: 'Missing file' }
  const form = new FormData()
  form.append('file', new Blob([fileEntry.buffer], { type: fileEntry.type || 'audio/wav' }), fileEntry.filename || 'audio')
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  const output = await response.json().catch(() => ({}))
  if (!response.ok) return { status: response.status, error: output.error?.message || 'Transcription failed' }
  return { status: 200, text: output.text || '' }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...SECURITY_HEADERS, ...CORS })
    res.end()
    return
  }

  const url = new URL(req.url || '/', APP_URL)
  const handle = async () => {
    if (url.pathname === '/health') return json(res, 200, { ok: true })

    if (url.pathname === '/api/auth/config' && req.method === 'GET') {
      return json(res, 200, publicOAuthConfig())
    }

    if (url.pathname === '/api/auth/exchange' && req.method === 'POST') {
      const raw = await readBody(req, MAX_BODY).catch(() => null)
      if (raw === null) return json(res, 413, { error: 'Request body too large' })
      return await handleOAuthExchange(req, res, raw)
    }

    if (req.method === 'POST') {
      if (url.pathname === '/api/ai/chat') {
        if (!(await requireAuthHeader(req, res))) return
        const body = await readBody(req, MAX_BODY).catch(() => null)
        if (body === null) return json(res, 413, { error: 'Request body too large' })
        try {
          return await handleChat(req, res, body)
        } catch {
          return json(res, 400, { error: 'Invalid request body.' })
        }
      }
      if (url.pathname === '/api/ai/image') {
        if (!(await requireAuthHeader(req, res))) return
        const body = await readBody(req, MAX_BODY).catch(() => null)
        if (body === null) return json(res, 413, { error: 'Request body too large' })
        try {
          return await handleImage(req, res, body)
        } catch {
          return json(res, 400, { error: 'Invalid request body.' })
        }
      }
      if (url.pathname === '/api/ai/transcribe') {
        if (!(await requireAuthHeader(req, res))) return
        const result = await handleTranscribe(req).catch(() => ({ status: 500, error: 'Transcription failed' }))
        return json(res, result.status, result.error ? { error: result.error } : { text: result.text })
      }
    }
    return json(res, 404, { error: 'Not found' })
  }

  try {
    if (!checkRateLimit(req, res)) return
    await handle()
  } catch (error) {
    console.error('[pixelcraft-backend]', error)
    if (!res.headersSent) json(res, 500, { error: 'Internal server error' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[pixelcraft-backend] listening on http://${HOST}:${PORT}`)
  console.log(`[pixelcraft-backend] OAuth redirect URI: ${OAUTH_REDIRECT_URI}`)
})
