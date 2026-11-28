import { useSyncExternalStore } from 'react'

type Listener = () => void
const listeners = new Set<Listener>()

/** Full location (path + query + hash) so ?tab=… deep links and back/forward work. */
function currentLocation() {
  return window.location.pathname + window.location.search + window.location.hash
}

let current = currentLocation()

function emit() {
  current = currentLocation()
  listeners.forEach((l) => l())
}

export function navigate(path: string) {
  if (path !== current) {
    window.history.pushState({}, '', path)
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
