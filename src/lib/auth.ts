/**
 * Local account auth for Pixelcraft (v2).
 *
 * Accounts live in IndexedDB ('users'). Passwords are hashed with PBKDF2
 * (100k iterations, per-user random salt). Sessions are HMAC-signed with a
 * non-extractable device key and expire automatically. Optional "remember me"
 * persists the signed token in localStorage; otherwise it stays in sessionStorage.
 *
 * This is a real local login flow, not a hosted identity provider. For a hosted
 * deployment, move account verification and sessions to the backend.
 */

import { db } from './db'
import { v4 } from '../store/ids'

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  createdAt: number
  /** 2 = PBKDF2 (current); missing = legacy SHA-256 account */
  hashVersion?: 1 | 2
  /** 'local' (default) or an OAuth provider id */
  provider?: string
  providerUserId?: string
}

export interface OAuthIdentityInput {
  provider: string
  providerUserId: string
  email: string
  name: string
}

export interface AuthSession {
  id: string
  userId: string
  email: string
  name: string
  provider?: string
  createdAt: number
  /** Unix ms when the session expires */
  expiresAt: number
  /** Remember-me persistence flag */
  rememberMe: boolean
}

export interface CsrfState {
  token: string
  createdAt: number
}

export interface LockoutState {
  locked: boolean
  retryIn?: number
  attemptsLeft: number
}

interface DeviceKeyRecord {
  id: string
  key: CryptoKey
}

/** PBKDF2 iterations — balances security vs client cost. */
const PBKDF2_ITERATIONS = 100_000

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000

const SESSION_KEY = 'pixelcraft-session'
const REMEMBER_KEY = 'pixelcraft-remember'
const CSRF_KEY = 'pixelcraft-csrf'
const LOCKOUT_KEY = 'pixelcraft-lockout'
const DEVICE_KEY_ID = 'device-session-key'

/** Lockout: max 5 failed attempts per 15 minutes per email. */
const MAX_ATTEMPTS = 5
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000
const CSRF_TTL_MS = 24 * 60 * 60 * 1000

async function hashPassword(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Original v1 format — kept only to verify and upgrade legacy accounts. */
async function legacyHash(password: string, salt: string): Promise<string> {
  return sha256Hex(password + salt)
}

function randSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randToken(): string {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Non-extractable HMAC key, generated once per browser profile. */
async function getDeviceKey(): Promise<CryptoKey> {
  const existing = await db.get<DeviceKeyRecord>('settings', DEVICE_KEY_ID)
  if (existing?.key) return existing.key
  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign', 'verify'],
  )
  await db.put('settings', { id: DEVICE_KEY_ID, key } as DeviceKeyRecord)
  return key
}

async function signSession(session: AuthSession): Promise<string> {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)))
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await getDeviceKey(), new TextEncoder().encode(payload)),
  )
  return `${payload}.${toBase64Url(signature)}`
}

async function verifySessionToken(token: string): Promise<AuthSession | null> {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getDeviceKey(),
      fromBase64Url(signature),
      new TextEncoder().encode(payload),
    )
    if (!valid) return null
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as AuthSession
    if (!parsed.userId || !parsed.expiresAt || Date.now() > parsed.expiresAt) return null
    // Make sure the account still exists and profile changes are reflected.
    const users = await db.getAll<User>('users')
    const user = users.find((u) => u.id === parsed.userId)
    if (!user) return null
    return { ...parsed, name: user.name, email: user.email, provider: user.provider || 'local' }
  } catch {
    return null
  }
}

async function getUserByEmail(email: string): Promise<User | undefined> {
  const all = await db.getAll<User>('users')
  return all.find((u) => u.email === email.toLowerCase())
}

export async function createUser(opts: { email: string; name: string; password: string }): Promise<User | 'exists'> {
  const email = opts.email.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
  if (opts.password.length < 8) throw new Error('Password must be at least 8 characters.')
  if (await getUserByEmail(email)) return 'exists'
  const user: User = {
    id: v4(),
    email,
    name: opts.name.trim() || email,
    passwordHash: '',
    salt: randSalt(),
    hashVersion: 2,
    createdAt: Date.now(),
  }
  user.passwordHash = await hashPassword(opts.password, user.salt)
  await db.put('users', user)
  return user
}

export interface AccountHint {
  email: string
  name: string
  provider: string
}

/** Accounts stored on this device — used by the login page to show what exists. */
export async function listLocalAccounts(): Promise<AccountHint[]> {
  const all = await db.getAll<User>('users')
  return all
    .filter((user) => !user.provider || user.provider === 'local')
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((user) => ({ email: user.email, name: user.name, provider: user.provider || 'local' }))
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email.toLowerCase())
  if (!user) return null

  // Current format first.
  let matched = (await hashPassword(password, user.salt || '')) === user.passwordHash

  // Older builds used plain SHA-256(password + salt), SHA-256(password), or
  // even plain text. Accept any of them so no existing account is locked out.
  let viaLegacy = false
  if (!matched) {
    const candidates = [
      await legacyHash(password, user.salt || ''),
      await sha256Hex(password),
      password,
    ]
    viaLegacy = candidates.includes(user.passwordHash)
    matched = viaLegacy
  }
  if (!matched) return null

  // Seamlessly upgrade any legacy account on its next successful login.
  if (viaLegacy || user.hashVersion !== 2) {
    const salt = randSalt()
    user.salt = salt
    user.passwordHash = await hashPassword(password, salt)
    user.hashVersion = 2
    await db.put('users', user)
  }
  return user
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<Pick<User, 'name' | 'email'>>,
): Promise<User | null> {
  const all = await db.getAll<User>('users')
  const user = all.find((u) => u.id === userId)
  if (!user) return null
  const next = { ...user, ...patch }
  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
    if (all.some((u) => u.email === email && u.id !== userId)) throw new Error('That email is already in use.')
    next.email = email
  }
  if (patch.name !== undefined) next.name = patch.name.trim() || next.email
  await db.put('users', next)
  return next
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const all = await db.getAll<User>('users')
  const user = all.find((u) => u.id === userId)
  if (!user) return false
  if (!(await verifyUser(user.email, currentPassword))) return false
  if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.')
  const salt = randSalt()
  user.salt = salt
  user.passwordHash = await hashPassword(newPassword, salt)
  user.hashVersion = 2
  await db.put('users', user)
  return true
}

// --- Login throttling ---
function getLockout(email: string): { count: number; until: number } | null {
  try {
    const raw = localStorage.getItem(`${LOCKOUT_KEY}:${email.toLowerCase()}`)
    if (!raw) return null
    const data = JSON.parse(raw) as { count: number; until: number }
    if (Date.now() > data.until) return null
    return data
  } catch {
    return null
  }
}

function recordFailedAttempt(email: string) {
  const existing = getLockout(email) ?? { count: 0, until: Date.now() + LOCKOUT_WINDOW_MS }
  const count = existing.count + 1
  localStorage.setItem(
    `${LOCKOUT_KEY}:${email.toLowerCase()}`,
    JSON.stringify({
      count,
      until: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_WINDOW_MS : existing.until,
    }),
  )
}

function clearLockout(email: string) {
  localStorage.removeItem(`${LOCKOUT_KEY}:${email.toLowerCase()}`)
}

/** Clear every login lockout. */
export function clearAllLockouts() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(`${LOCKOUT_KEY}:`)) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
}

/**
 * One-time cleanup for lockouts caused by the old SHA-256 verification bug.
 * Without this, a user who retried the old password several times would still
 * be blocked for 15 minutes even after the fix.
 */
export function resetLegacyLockouts() {
  const flag = 'pixelcraft-lockout-reset-v2'
  if (localStorage.getItem(flag)) return
  clearAllLockouts()
  localStorage.setItem(flag, '1')
}

export function isLockedOut(email: string): LockoutState {
  const lock = getLockout(email)
  if (!lock) return { locked: false, attemptsLeft: MAX_ATTEMPTS }
  const remainingMs = Math.max(0, lock.until - Date.now())
  return {
    locked: remainingMs > 0 && lock.count >= MAX_ATTEMPTS,
    retryIn: remainingMs > 0 ? Math.ceil(remainingMs / 60_000) : undefined,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - lock.count),
  }
}

// --- Sessions ---
export async function getSession(): Promise<AuthSession | null> {
  try {
    const token = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(REMEMBER_KEY)
    if (!token) return null
    const session = await verifySessionToken(token)
    if (!session) {
      clearSession()
      return null
    }
    return session
  } catch {
    return null
  }
}

export async function setSession(session: AuthSession, rememberMe = session.rememberMe): Promise<void> {
  const payload: AuthSession = { ...session, rememberMe }
  const token = await signSession(payload)
  sessionStorage.setItem(SESSION_KEY, token)
  if (rememberMe) localStorage.setItem(REMEMBER_KEY, token)
  else localStorage.removeItem(REMEMBER_KEY)
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(REMEMBER_KEY)
}

// --- CSRF token for API requests ---
export function getCsrfToken(): string {
  try {
    const raw = sessionStorage.getItem(CSRF_KEY)
    if (raw) {
      const state = JSON.parse(raw) as CsrfState
      if (state.token && Date.now() - state.createdAt < CSRF_TTL_MS) return state.token
    }
  } catch {
    // regenerate below
  }
  const token = randToken()
  sessionStorage.setItem(CSRF_KEY, JSON.stringify({ token, createdAt: Date.now() }))
  return token
}

export function verifyCsrfToken(token: string): boolean {
  try {
    const raw = sessionStorage.getItem(CSRF_KEY)
    if (!raw) return false
    const state = JSON.parse(raw) as CsrfState
    return state.token === token && Date.now() - state.createdAt < CSRF_TTL_MS
  } catch {
    return false
  }
}

function makeSession(user: User, rememberMe: boolean): AuthSession {
  return {
    id: v4(),
    userId: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider || 'local',
    createdAt: Date.now(),
    expiresAt: Date.now() + (rememberMe ? REMEMBER_TTL_MS : DEFAULT_TTL_MS),
    rememberMe,
  }
}

export async function signupUser(opts: {
  email: string
  name: string
  password: string
  rememberMe?: boolean
}): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const created = await createUser(opts)
  if (created === 'exists') {
    return { ok: false, error: 'An account with this email already exists. Try signing in.' }
  }
  const session = makeSession(created, !!opts.rememberMe)
  await setSession(session, session.rememberMe)
  return { ok: true, session }
}

export async function loginUser(opts: {
  email: string
  password: string
  rememberMe?: boolean
}): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const email = opts.email.trim().toLowerCase()
  const lock = isLockedOut(email)
  if (lock.locked) {
    return { ok: false, error: `Too many failed attempts. Try again in ${lock.retryIn} minute(s).` }
  }
  const existing = await getUserByEmail(email)
  if (!existing) {
    return {
      ok: false,
      error: 'No account found with this email on this device. Tap "No account? Create one" to register.',
    }
  }
  const user = await verifyUser(email, opts.password)
  if (!user) {
    recordFailedAttempt(email)
    const after = isLockedOut(email)
    return {
      ok: false,
      error: after.locked
        ? `Incorrect password. Too many attempts — try again in ${after.retryIn} minute(s).`
        : `Incorrect password. ${after.attemptsLeft} attempt(s) left.`,
    }
  }
  clearLockout(email)
  const session = makeSession(user, !!opts.rememberMe)
  await setSession(session, session.rememberMe)
  return { ok: true, session }
}

/**
 * Find or create the local account linked to a verified OAuth identity.
 * Provider emails are verified server-side before this is called.
 */
export async function findOrCreateOAuthUser(identity: OAuthIdentityInput): Promise<User> {
  const email = identity.email.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Provider email is invalid.')
  if (!identity.providerUserId) throw new Error('Provider profile is incomplete.')

  const all = await db.getAll<User>('users')
  const linked = all.find(
    (user) => user.provider === identity.provider && user.providerUserId === identity.providerUserId,
  )
  if (linked) {
    const next = { ...linked, email, name: identity.name.trim() || linked.name }
    if (next.email !== linked.email || next.name !== linked.name) await db.put('users', next)
    return next
  }

  // Verified provider email can safely link to an existing local account.
  const byEmail = all.find((user) => user.email === email)
  if (byEmail) {
    const linkedByEmail: User = {
      ...byEmail,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      name: identity.name.trim() || byEmail.name,
    }
    await db.put('users', linkedByEmail)
    return linkedByEmail
  }

  const salt = randSalt()
  const user: User = {
    id: v4(),
    email,
    name: identity.name.trim() || email.split('@')[0],
    passwordHash: await hashPassword(randToken(), salt),
    salt,
    hashVersion: 2,
    createdAt: Date.now(),
    provider: identity.provider,
    providerUserId: identity.providerUserId,
  }
  await db.put('users', user)
  return user
}

export async function signInWithOAuth(
  identity: OAuthIdentityInput,
  rememberMe = false,
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  try {
    const user = await findOrCreateOAuthUser(identity)
    const session = makeSession(user, rememberMe)
    await setSession(session, session.rememberMe)
    return { ok: true, session }
  } catch (error) {
    return { ok: false, error: (error as Error).message || 'Provider sign-in failed.' }
  }
}

export function logoutUser(): void {
  clearSession()
}
