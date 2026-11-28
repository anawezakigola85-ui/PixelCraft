import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '../lib/types'
import { db } from '../lib/db'

/**
 * Image generation goes through OpenAI's images endpoint on the backend, so the
 * default model must be an image model (the old gpt-4o-mini default was a chat
 * model and could never generate images).
 */
export const DEFAULT_IMAGE_MODEL = 'dall-e-3'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'en',
  aiProvider: 'openai',
  aiModel: DEFAULT_IMAGE_MODEL,
  aiApiKey: '',
  exportFormat: 'png',
  exportQuality: 90,
  shortcuts: {
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    save: 'Ctrl+S',
    playPause: 'Space',
    delete: 'Delete',
    newProject: 'Ctrl+N',
  },
}

/** Theme and language are document-level settings; apply them on every change. */
function applyDocumentSettings(settings: Pick<AppSettings, 'theme' | 'language'>) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', settings.theme)
  document.documentElement.lang = settings.language
}

export const useSettings = create<AppSettings>()(
  persist(
    () => ({ ...DEFAULT_SETTINGS }),
    {
      name: 'pixelcraft-settings',
      merge: (persisted, current) => ({ ...current, ...(persisted as object) }),
      // Security: never persist the informational API key field to storage.
      partialize: (state) => ({ ...state, aiApiKey: '' }),
    },
  ),
)

useSettings.subscribe((settings) => applyDocumentSettings(settings))
applyDocumentSettings(useSettings.getState())

export async function loadSettings() {
  const stored = await db.get<AppSettings>('settings', 'app-settings')
  if (!stored) return
  const merged: AppSettings = { ...useSettings.getState(), ...stored }
  // Migrate the old broken default (a chat model) to a working image model.
  if (merged.aiProvider === 'openai' && merged.aiModel === 'gpt-4o-mini') {
    merged.aiModel = DEFAULT_IMAGE_MODEL
  }
  useSettings.setState(merged)
}

export async function saveSettings(next: AppSettings) {
  useSettings.setState(next)
  await db.put('settings', { ...next, id: 'app-settings' })
}

/**
 * Export preferences consumed by the canvas exporter. CanvasEditor still needs
 * to call this helper (or read exportFormat/exportQuality from useSettings)
 * instead of its hardcoded png/jpeg/webp buttons and 0.9 quality.
 */
export function getCanvasExportOptions() {
  const { exportFormat, exportQuality } = useSettings.getState()
  return { format: exportFormat, quality: exportQuality / 100 }
}
