import { useAuth } from '../store/authStore'
import { Button } from '../components/ui/Button'

export function SignOutButton() {
  const logout = useAuth((s) => s.logout)
  return <Button variant="destructive" onClick={logout}>Sign Out</Button>
}
