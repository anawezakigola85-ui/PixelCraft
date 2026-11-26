/**
 * Central API URL resolver.
 *
 * - VITE_API_BASE_URL: absolute backend origin, e.g. https://pixelcraft-api.onrender.com
 * - When unset, requests stay relative (/api) and rely on the Vite dev proxy
 *   in development, or a platform rewrite configured for production.
 *
 * No secrets belong here. API keys stay in backend/.env.
 */
const configured = (import.meta.env.VITE_API_BASE_URL || '').trim()
export const API_BASE_URL = configured.replace(/\/+$/, '')

export function apiUrl(path: string): string {
  if (!API_BASE_URL) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
