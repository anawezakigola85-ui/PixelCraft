import { useEffect, useState, type FormEvent } from 'react'
import Logo from '../components/ui/Logo'
import LogoBackdrop from '../components/ui/LogoBackdrop'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../store/authStore'
import { useProjects } from '../store/projectsStore'
import { listLocalAccounts, type AccountHint } from '../lib/auth'
import {
  getOAuthConfig,
  startOAuthSignIn,
  type OAuthConfig,
  type OAuthProvider,
} from '../lib/oauth'
import { MoonStar, Sparkles, Terminal, Eye, EyeOff } from 'lucide-react'

const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'apple', 'microsoft']

const PROVIDER_BADGE: Record<OAuthProvider, { letter: string; className: string }> = {
  google: { letter: 'G', className: 'bg-white text-[#4285F4]' },
  apple: { letter: 'A', className: 'bg-black text-white' },
  microsoft: { letter: 'M', className: 'bg-[#00A4EF] text-white' },
}

export default function LoginPage() {
  const { login, signup, error, pending, lockout, clearError, clearLockout } = useAuth()
  const { loadProjects } = useProjects()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [signupMode, setSignupMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [localError, setLocalError] = useState('')
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null)
  const [oauthUnavailable, setOauthUnavailable] = useState(false)
  const [accounts, setAccounts] = useState<AccountHint[]>([])

  const refreshAccounts = () => {
    void listLocalAccounts().then(setAccounts).catch(() => setAccounts([]))
  }

  useEffect(() => {
    refreshAccounts()
  }, [])

  useEffect(() => {
    let mounted = true
    void getOAuthConfig()
      .then((config) => {
        if (mounted) setOauthConfig(config)
      })
      .catch(() => {
        if (mounted) setOauthUnavailable(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleProvider = async (provider: OAuthProvider) => {
    setLocalError('')
    if (!oauthConfig) {
      setLocalError(oauthUnavailable
        ? 'Social sign-in is unavailable — start the backend server.'
        : 'Sign-in options are still loading.')
      return
    }
    const option = oauthConfig.providers[provider]
    if (!option?.enabled) {
      setLocalError(`${option?.label || provider} sign-in is not configured. Add its credentials to backend/.env.`)
      return
    }
    try {
      await startOAuthSignIn(provider, oauthConfig)
    } catch (error) {
      setLocalError((error as Error).message || 'Could not start provider sign-in.')
    }
  }

  const switchMode = () => {
    clearError()
    clearLockout()
    setLocalError('')
    setSignupMode((mode) => !mode)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError('Enter a valid email address.')
      return
    }
    if (!password) {
      setLocalError('Enter your password.')
      return
    }
    if (signupMode && password.length < 8) {
      setLocalError('New password must be at least 8 characters.')
      return
    }
    if (signupMode && !name.trim()) {
      setLocalError('Enter your name to create an account.')
      return
    }
    const ok = signupMode
      ? await signup(email, name, password, rememberMe)
      : await login(email, password, rememberMe)
    if (ok) {
      refreshAccounts()
      void loadProjects()
    }
  }

  const message = localError || error

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center px-4 py-12">
      <LogoBackdrop size={460} />
      <form
        onSubmit={(event) => void submit(event)}
        className="glass-strong relative z-10 rounded-3xl p-8 sm:p-12 w-full max-w-md animate-slide-up"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <Logo size={40} className="shrink-0" />
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Pixelcraft</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {signupMode ? 'Create your creative account' : 'Welcome back — sign in to continue'}
            </p>
          </div>
        </div>

        {lockout?.locked && (
          <div className="mb-4 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
            Too many failed attempts. Try again in {lockout.retryIn} minute(s).
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs text-[var(--color-text-muted)] mb-1.5 block">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearLockout()
              }}
              autoComplete="email"
              autoFocus
            />
          </div>

          {!signupMode && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)]/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                Accounts on this device
              </p>
              {accounts.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {accounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setEmail(account.email)
                        clearError()
                        clearLockout()
                      }}
                      className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-[var(--color-text)] transition hover:border-[var(--color-accent-2)] hover:text-[var(--color-accent-2)]"
                    >
                      {account.email}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  None yet — tap “No account? Create one” below to register.
                </p>
              )}
            </div>
          )}

          {signupMode && (
            <div>
              <label htmlFor="name" className="text-xs text-[var(--color-text-muted)] mb-1.5 block">
                Display name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="text-xs text-[var(--color-text-muted)] mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={signupMode ? 'At least 8 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={signupMode ? 'new-password' : 'current-password'}
                className="pr-8"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-accent-2)]"
            />
            Keep me signed in for 30 days
          </label>

          {message && (
            <div className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 rounded-lg px-3 py-2 border border-[var(--color-danger)]/30">
              {message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 brand-gradient text-black font-semibold"
            disabled={pending || lockout?.locked}
          >
            {pending ? 'Please wait…' : signupMode ? 'Create Account' : 'Sign In'}
          </Button>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              <span className="h-px flex-1 bg-[var(--color-border)]" />
              or continue with
              <span className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {OAUTH_PROVIDERS.map((provider) => {
                const option = oauthConfig?.providers[provider]
                const badge = PROVIDER_BADGE[provider]
                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => void handleProvider(provider)}
                    title={option?.enabled ? `Sign in with ${option.label}` : 'Not configured on the server'}
                    className={`flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-xs font-medium transition hover:border-[var(--color-accent-3)] hover:text-[var(--color-accent-2)] ${option?.enabled ? '' : 'opacity-60'}`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${badge.className}`}>
                      {badge.letter}
                    </span>
                    {option?.label || (provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : 'Microsoft')}
                  </button>
                )
              })}
            </div>
            <p className="text-center text-[10px] text-[var(--color-text-muted)]">
              {oauthUnavailable
                ? 'Backend offline — social sign-in needs the Node server running.'
                : oauthConfig
                  ? 'Desktop-friendly OAuth. Configure IDs in backend/.env to activate.'
                  : 'Loading sign-in options…'}
            </p>
          </div>

          <button type="button" className="block w-full text-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent-2)]" onClick={switchMode}>
            {signupMode ? 'Already have an account? Sign in instead' : 'No account? Create one'}
          </button>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)] pt-5">
          <MoonStar className="h-3 w-3 text-[var(--color-accent-2)]" />
          <span>Accounts stay on this device. Passwords are hashed with PBKDF2.</span>
          <Sparkles className="h-3 w-3" />
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-border)] space-y-2 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <Terminal className="h-3 w-3" />
            <span>Local + OAuth sign-in · signed, expiring sessions</span>
          </div>
          <p>
            OAuth credentials and AI keys remain server-side in <code>backend/.env</code>.
          </p>
        </div>
      </form>
    </div>
  )
}
