/**
 * OAuth 2.0 Authorization Code + PKCE helper.
 *
 * Client credentials stay on the backend. This module only builds the provider
 * URL, keeps the PKCE verifier/state/nonce in sessionStorage, and exchanges the
 * returned code through /api/auth/exchange.
 */

import { apiUrl } from './api'

export type OAuthProvider = 'google' | 'apple' | 'microsoft'

export interface OAuthProviderOption {
  enabled: boolean
  label: string
  authorize?: string
  clientId?: string
  scope?: string
  extra?: Record<string, string>
}

export interface OAuthConfig {
  redirectUri: string
  providers: Record<OAuthProvider, OAuthProviderOption>
}

export interface OAuthIdentity {
  provider: OAuthProvider
  providerUserId: string
  email: string
  name: string
}

interface PendingSignIn {
  provider: OAuthProvider
  state: string
  nonce: string
  verifier: string
  redirectUri: string
  createdAt: number
}

const PENDING_PREFIX = 'pixelcraft-oauth:'
const PENDING_TTL_MS = 10 * 60 * 1000

let cachedConfig: { config: OAuthConfig; fetchedAt: number } | null = null

function base64Url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

export async function createPkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomToken(32)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: base64Url(new Uint8Array(digest)) }
}

export async function getOAuthConfig(forceRefresh = false): Promise<OAuthConfig> {
  if (!forceRefresh && cachedConfig && Date.now() - cachedConfig.fetchedAt < 60_000) {
    return cachedConfig.config
  }
  const response = await fetch(apiUrl('/api/auth/config'))
  if (!response.ok) throw new Error('Could not load sign-in options.')
  const data = (await response.json()) as Partial<OAuthConfig>
  if (!data.redirectUri || !data.providers) throw new Error('Sign-in options are invalid.')
  const config = data as OAuthConfig
  cachedConfig = { config, fetchedAt: Date.now() }
  return config
}

function savePending(provider: OAuthProvider, pending: PendingSignIn) {
  sessionStorage.setItem(`${PENDING_PREFIX}${provider}`, JSON.stringify(pending))
}

function readPending(provider: OAuthProvider): PendingSignIn | null {
  try {
    const raw = sessionStorage.getItem(`${PENDING_PREFIX}${provider}`)
    if (!raw) return null
    const pending = JSON.parse(raw) as PendingSignIn
    if (!pending.state || Date.now() - pending.createdAt > PENDING_TTL_MS) {
      sessionStorage.removeItem(`${PENDING_PREFIX}${provider}`)
      return null
    }
    return pending
  } catch {
    return null
  }
}

function findPendingByState(state: string | null): { provider: OAuthProvider; pending: PendingSignIn } | null {
  if (!state) return null
  const providers: OAuthProvider[] = ['google', 'apple', 'microsoft']
  for (const provider of providers) {
    const pending = readPending(provider)
    if (pending && pending.state === state) return { provider, pending }
  }
  return null
}

export function clearPendingOAuth() {
  const keys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(PENDING_PREFIX)) keys.push(key)
  }
  keys.forEach((key) => sessionStorage.removeItem(key))
}

export async function startOAuthSignIn(provider: OAuthProvider, config: OAuthConfig): Promise<void> {
  const option = config.providers[provider]
  if (!option?.enabled || !option.authorize || !option.clientId) {
    throw new Error(`${option?.label || provider} sign-in is not configured on the server.`)
  }

  const { verifier, challenge } = await createPkce()
  const state = randomToken()
  const nonce = randomToken()
  savePending(provider, {
    provider,
    state,
    nonce,
    verifier,
    redirectUri: config.redirectUri,
    createdAt: Date.now(),
  })

  const url = new URL(option.authorize)
  const params = new URLSearchParams({
    client_id: option.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: option.scope || 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  Object.entries(option.extra || {}).forEach(([key, value]) => params.set(key, value))
  url.search = params.toString()
  window.location.assign(url.toString())
}

function parseAppleUser(raw: string | null): Record<string, unknown> | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

export async function handleOAuthCallback(): Promise<OAuthIdentity> {
  const query = new URLSearchParams(window.location.search)
  const providerError = query.get('error')
  if (providerError) {
    clearPendingOAuth()
    throw new Error(query.get('error_description') || `Sign-in was cancelled or failed (${providerError}).`)
  }

  const code = query.get('code')
  const match = findPendingByState(query.get('state'))
  if (!code) {
    clearPendingOAuth()
    throw new Error('No authorization code was returned by the provider.')
  }
  if (!match) {
    clearPendingOAuth()
    throw new Error('Sign-in session expired or state did not match. Please try again.')
  }

  sessionStorage.removeItem(`${PENDING_PREFIX}${match.provider}`)
  const response = await fetch(apiUrl('/api/auth/exchange'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: match.provider,
      code,
      codeVerifier: match.pending.verifier,
      redirectUri: match.pending.redirectUri,
      nonce: match.pending.nonce,
      user: match.provider === 'apple' ? parseAppleUser(query.get('user')) : undefined,
    }),
  })
  const data = (await response.json().catch(() => ({}))) as OAuthIdentity & { error?: string }
  if (!response.ok) throw new Error(data.error || `Provider sign-in failed (${response.status}).`)
  if (!data.providerUserId || !data.email) throw new Error('Provider returned an incomplete profile.')
  return {
    provider: data.provider,
    providerUserId: data.providerUserId,
    email: data.email,
    name: data.name || data.email.split('@')[0],
  }
}
