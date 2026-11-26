import { useEffect } from 'react'
import { navigate, useLocation } from './Router'
import { useAuth } from '../store/authStore'
import { loadSettings } from '../store/settings'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import Dashboard from './Dashboard'
import Editor from './Editor'
import SettingsPage from './SettingsPage'
import TemplateLibrary from './TemplateLibrary'
import AIImageGen from './AIImageGen'
import AccountPage from './AccountPage'
import LoginPage from './LoginPage'
import OAuthCallback from './OAuthCallback'
import EditorWorkspace from './EditorWorkspace'

function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
      Loading…
    </div>
  )
}

export default function App() {
  const { checked, session } = useAuth()
  const location = useLocation()

  useEffect(() => {
    void loadSettings()
    void useAuth.getState().loadSession()
  }, [])

  useEffect(() => {
    if (checked && session && location === '/login') navigate('/')
  }, [checked, session, location])

  if (location.startsWith('/auth/callback')) return <OAuthCallback />

  if (!checked) return <Loading />

  // Already signed in? Do not show the login form again.
  if (location === '/login') return session ? <Dashboard /> : <LoginPage />

  let page
  if (location.startsWith('/workspace')) page = <EditorWorkspace />
  else if (location.startsWith('/account')) page = <AccountPage />
  else if (location.startsWith('/editor/')) page = <Editor />
  else if (location.startsWith('/settings')) page = <SettingsPage />
  else if (location.startsWith('/templates')) page = <TemplateLibrary />
  else if (location.startsWith('/ai')) page = <AIImageGen />
  else page = <Dashboard />

  return <ProtectedRoute fallback={<Loading />}>{page}</ProtectedRoute>
}
