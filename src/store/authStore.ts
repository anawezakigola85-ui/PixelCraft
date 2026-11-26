import { create } from 'zustand'
import {
  loginUser,
  signupUser,
  logoutUser,
  getSession,
  setSession,
  getCsrfToken,
  isLockedOut,
  updateUserProfile,
  updateUserPassword,
  signInWithOAuth,
  resetLegacyLockouts,
  type AuthSession,
  type LockoutState,
  type OAuthIdentityInput,
} from '../lib/auth'
import { navigate } from '../app/Router'

export interface AuthStore {
  session: AuthSession | null
  checked: boolean
  error: string
  pending: boolean
  csrfToken: string
  lockout: LockoutState | null
  loadSession: () => Promise<void>
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>
  signup: (email: string, name: string, password: string, rememberMe?: boolean) => Promise<boolean>
  oauthSignIn: (identity: OAuthIdentityInput) => Promise<boolean>
  logout: () => void
  updateProfile: (opts: { name?: string; email?: string }) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  clearError: () => void
  clearLockout: () => void
}

export const useAuth = create<AuthStore>()((set, get) => ({
  session: null,
  checked: false,
  error: '',
  pending: false,
  csrfToken: getCsrfToken(),
  lockout: null,

  async loadSession() {
    resetLegacyLockouts()
    const session = await getSession()
    set({ session, checked: true })
    if (session) {
      void import('../store/projectsStore').then(({ useProjects }) => {
        useProjects.getState().loadProjects()
      })
    }
  },

  async login(email, password, rememberMe = false) {
    if (get().pending) return false
    set({ pending: true, error: '' })
    try {
      const result = await loginUser({ email, password, rememberMe })
      if (!result.ok) {
        set({ error: result.error, lockout: isLockedOut(email) })
        return false
      }
      set({ session: result.session, error: '', lockout: null })
      navigate('/')
      return true
    } catch (error) {
      set({ error: (error as Error).message || 'Sign-in failed. Please try again.' })
      return false
    } finally {
      set({ pending: false })
    }
  },

  async signup(email, name, password, rememberMe = false) {
    if (get().pending) return false
    set({ pending: true, error: '' })
    try {
      const result = await signupUser({ email, name, password, rememberMe })
      if (!result.ok) {
        set({ error: result.error })
        return false
      }
      set({ session: result.session, error: '' })
      navigate('/')
      return true
    } catch (error) {
      set({ error: (error as Error).message || 'Account creation failed. Please try again.' })
      return false
    } finally {
      set({ pending: false })
    }
  },

  async oauthSignIn(identity) {
    set({ pending: true, error: '' })
    try {
      const result = await signInWithOAuth(identity)
      if (!result.ok) {
        set({ error: result.error })
        return false
      }
      set({ session: result.session, error: '', lockout: null })
      navigate('/')
      return true
    } catch (error) {
      set({ error: (error as Error).message || 'Provider sign-in failed.' })
      return false
    } finally {
      set({ pending: false })
    }
  },

  async updateProfile(opts) {
    const session = get().session
    if (!session) return false
    set({ error: '' })
    try {
      const user = await updateUserProfile(session.userId, opts)
      if (!user) {
        set({ error: 'Account not found.' })
        return false
      }
      const updated: AuthSession = { ...session, name: user.name, email: user.email }
      await setSession(updated, updated.rememberMe)
      set({ session: updated })
      return true
    } catch (error) {
      set({ error: (error as Error).message })
      return false
    }
  },

  async changePassword(currentPassword, newPassword) {
    const session = get().session
    if (!session) return false
    set({ error: '' })
    try {
      const ok = await updateUserPassword(session.userId, currentPassword, newPassword)
      if (!ok) {
        set({ error: 'Current password is incorrect.' })
        return false
      }
      return true
    } catch (error) {
      set({ error: (error as Error).message })
      return false
    }
  },

  logout() {
    logoutUser()
    set({ session: null, error: '', lockout: null, csrfToken: getCsrfToken() })
    navigate('/login')
  },

  clearError() {
    set({ error: '' })
  },

  clearLockout() {
    set({ lockout: null, error: '' })
  },
}))
