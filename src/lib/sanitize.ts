/**
 * Input sanitization & validation helpers (security pass).
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Strip control chars, trim and cap length. */
export function sanitizeText(input: unknown, maxLength = 200): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[-]/g, '').trim().slice(0, maxLength)
}

/** Recursively strip prototype-pollution keys and non-JSON values. */
export function sanitizeObj<T>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const src = obj as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(src)) {
    if (FORBIDDEN_KEYS.has(k)) continue
    const v = src[k]
    out[k] = v && typeof v === 'object' ? sanitizeObj(v) : v
  }
  return out as T
}

/** Validate minimal project shape (used when importing JSON). */
export function validateProject(p: Record<string, unknown>): p is Record<string, unknown> {
  if (!p || typeof p !== 'object') return false
  if (typeof p.name !== 'string' || p.name.trim().length === 0 || p.name.length > 200) return false
  if (typeof p.type !== 'string' || !['image', 'video', 'graphics', 'social'].includes(p.type)) return false
  if (!Array.isArray(p.elements)) return false
  return true
}

/** Cap name length for projects */
export function sanitizeProjectName(name: string, maxLength = 100): string {
  return name.trim().slice(0, maxLength) || 'Untitled project'
}
