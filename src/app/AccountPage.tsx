import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../store/authStore'
import { navigate } from './Router'

export default function AccountPage() {
  const { session, updateProfile, changePassword, logout, clearError } = useAuth()
  const [name, setName] = useState(session?.name ?? '')
  const [email, setEmail] = useState(session?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('')
  const [passwordStatus, setPasswordStatus] = useState('')

  useEffect(() => {
    setName(session?.name ?? '')
    setEmail(session?.email ?? '')
  }, [session?.name, session?.email])

  if (!session) return null

  const saveProfile = async () => {
    setStatus('')
    clearError()
    if (!name.trim()) {
      setStatus('Name is required.')
      return
    }
    const ok = await updateProfile({ name: name.trim(), email: email.trim() || undefined })
    setStatus(ok ? 'Profile updated.' : useAuth.getState().error || 'Update failed — check your input.')
  }

  const savePassword = async () => {
    setPasswordStatus('')
    clearError()
    if (newPassword.length < 8) {
      setPasswordStatus('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('New passwords do not match.')
      return
    }
    const ok = await changePassword(currentPassword, newPassword)
    if (ok) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStatus('Password changed successfully.')
    } else {
      setPasswordStatus(useAuth.getState().error || 'Could not change password.')
    }
  }

  const isError = (message: string) => /fail|incorrect|required|invalid|match|short|use/i.test(message)

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 glass-strong border-b border-[var(--color-border)] px-8 py-4">
        <div className="mx-auto max-w-3xl flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent-2)]">
            ← Dashboard
          </button>
          <h1 className="font-display text-2xl font-bold">My Account</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-8 py-8">
        <section className="glass-strong rounded-2xl p-6 space-y-5 animate-slide-up">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-3)] font-bold text-black">
              {(session.name || session.email).slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{session.name || session.email}</p>
              <p className="truncate text-sm text-[var(--color-text-muted)]">{session.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="account-name" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
                Full name
              </label>
              <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="account-email" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
                Email address
              </label>
              <Input id="account-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          {status && (
            <p className={`text-xs ${isError(status) ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
              {status}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void saveProfile()} className="brand-gradient text-black">
              Save Changes
            </Button>
            <Button variant="outline" onClick={logout} className="text-[var(--color-danger)]">
              Sign Out
            </Button>
          </div>
        </section>

        <section className="glass-strong rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Change Password</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Requires your current password. Minimum 8 characters.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="current-password" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
                Current password
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
                Confirm new password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          {passwordStatus && (
            <p className={`text-xs ${isError(passwordStatus) ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
              {passwordStatus}
            </p>
          )}
          <Button variant="secondary" onClick={() => void savePassword()}>
            Update Password
          </Button>
        </section>

        <section className="glass-strong rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold">Session</h2>
          <dl className="mt-3 grid gap-2 text-sm text-[var(--color-text-muted)] sm:grid-cols-2">
            <div>
              <dt className="text-xs">Session started</dt>
              <dd>{new Date(session.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs">Expires</dt>
              <dd>{new Date(session.expiresAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs">Persistence</dt>
              <dd>{session.rememberMe ? 'Remembered for 30 days' : 'This browser tab only'}</dd>
            </div>
            <div>
              <dt className="text-xs">Sign-in method</dt>
              <dd>{session.provider ? session.provider[0].toUpperCase() + session.provider.slice(1) : 'Email & password'}</dd>
            </div>
            <div>
              <dt className="text-xs">Security</dt>
              <dd>Signed token · device-bound</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  )
}
