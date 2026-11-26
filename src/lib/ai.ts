/**
 * AI helper module — talks to the Node backend (/api/*) which owns API keys.
 */

import { useSettings } from '../store/settings'
import { getCsrfToken } from './auth'
import { apiUrl } from './api'

/** App-scoped token sent to the backend; keys never leave backend/.env. */
function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: getCsrfToken(), ...extra }
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIGenerateImageResult {
  /** data url of generated image, or empty string when generation failed */
  url: string
  /** provider + model used (empty when failed) */
  provider: string
  model: string
  error?: string
}

export async function askAI(messages: AIChatMessage[]): Promise<string> {
  const { aiProvider, aiModel } = useSettings.getState()
  const res = await fetch(apiUrl('/api/ai/chat'), {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ provider: aiProvider, model: aiModel, messages }),
  })
  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `AI request failed (${res.status})`)
  }
  return data.message || ''
}

export async function generateImage(prompt: string, opts?: {
  negativePrompt?: string
  aspect?: '1:1' | '16:9' | '9:16'
  style?: string
}): Promise<AIGenerateImageResult> {
  const { aiProvider, aiModel } = useSettings.getState()
  const res = await fetch(apiUrl('/api/ai/image'), {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ provider: aiProvider, model: aiModel, prompt, ...(opts || {}) }),
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok) {
    return { url: '', provider: aiProvider, model: aiModel, error: data.error || `Image generation failed (${res.status})` }
  }
  return { url: data.url || '', provider: aiProvider, model: aiModel }
}

export async function transcribeAudio(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(apiUrl('/api/ai/transcribe'), {
    method: 'POST',
    headers: { Authorization: getCsrfToken() },
    body: form,
  })
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string }
  if (!res.ok) throw new Error(data.error || `Transcription failed (${res.status})`)
  return data.text || ''
}

/** Shortcuts for common creative prompts the assistant suggests. */
export const SUGGESTIONS = [
  'Create a cinematic TikTok video concept.',
  'Help me design a YouTube thumbnail.',
  'Suggest colors for this poster.',
  'Generate a caption for my social post.',
  'Improve my design layout.',
  'Suggest transitions for my video.',
  'Create a video storyboard.',
  'Rewrite my text more professionally.',
  'Suggest fonts for a tech poster.',
  'Create a social media content plan.',
  'Turn my idea into a design brief.',
  'Suggest editing improvements for this clip.',
]
