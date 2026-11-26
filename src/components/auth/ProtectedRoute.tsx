import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../../store/authStore'
import { navigate } from '../../app/Router'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

const defaultFallback = (
  <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
    Loading session…
  </div>
)

export function ProtectedRoute({ children, fallback = defaultFallback }: ProtectedRouteProps) {
  const { checked, session } = useAuth()

  useEffect(() => {
    if (checked && !session) navigate('/login')
  }, [checked, session])

  if (!checked) return fallback
  if (!session) return null
  return <>{children}</>
}
