import { useSyncExternalStore } from 'react'

type Listener = () => void
const listeners = new Set<Listener>()
let current = window.location.pathname

function emit() {
  listeners.forEach((l) => l())
}

export function navigate(path: string) {
  if (path !== current) {
    window.history.pushState({}, '', path)
    current = path
    emit()
  }
}

function subscribe(cb: Listener) {
  listeners.add(cb)
  window.addEventListener('popstate', emit)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('popstate', emit)
  }
}
function getSnapshot() {
  return current
}

export function useLocation() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useRouteParam(name: string): string | null {
  const loc = useLocation()
  const match = loc.match(new RegExp(`/(?:^|/)${name}/([^/?]+)`))
  if (match) return decodeURIComponent(match[1])
  return new URLSearchParams(window.location.search).get(name)
}
