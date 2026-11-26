import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '../lib/types'
import { db } from '../lib/db'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'en',
  aiProvider: 'openai',
  aiModel: 'gpt-4o-mini',
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

export async function loadSettings() {
  const stored = await db.get<AppSettings>('settings', 'app-settings')
  if (stored) useSettings.setState(stored)
}

export async function saveSettings(next: AppSettings) {
  useSettings.setState(next)
  await db.put('settings', { ...next, id: 'app-settings' })
}
