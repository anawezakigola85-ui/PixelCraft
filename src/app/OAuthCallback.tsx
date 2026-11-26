import { useEffect, useRef, useState } from 'react'
import Logo from '../components/ui/Logo'
import LogoBackdrop from '../components/ui/LogoBackdrop'
import { Button } from '../components/ui/Button'
import { useAuth } from '../store/authStore'
import { clearPendingOAuth, handleOAuthCallback } from '../lib/oauth'
import { navigate } from './Router'

const RUNNING_KEY = 'pixelcraft-oauth-callback-running'

export default function OAuthCallback() {
  const oauthSignIn = useAuth((state) => state.oauthSignIn)
  const started = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current || sessionStorage.getItem(RUNNING_KEY) === '1') return
    started.current = true
    sessionStorage.setItem(RUNNING_KEY, '1')

    void (async () => {
      try {
        const identity = await handleOAuthCallback()
        const ok = await oauthSignIn(identity)
        if (!ok) setError(useAuth.getState().error || 'Could not finish sign-in.')
        else navigate('/')
      } catch (caught) {
        setError((caught as Error).message || 'Could not finish sign-in.')
        clearPendingOAuth()
      } finally {
        sessionStorage.removeItem(RUNNING_KEY)
      }
    })()
  }, [oauthSignIn])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 text-[var(--color-text)]">
      <LogoBackdrop size={420} />
      <div className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-8 text-center animate-slide-up">
        <Logo size={48} className="mx-auto mb-4" />
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent-2)]" />
        <h1 className="font-display text-xl font-semibold">Completing sign-in…</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Verifying your provider account and creating your session.
        </p>
        {error && (
          <div className="mt-5 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
            {error}
          </div>
        )}
        {error && (
          <Button className="mt-4" variant="secondary" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        )}
      </div>
    </div>
  )
}
