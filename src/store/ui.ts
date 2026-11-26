import { create } from 'zustand'
import type { EditorView } from '../lib/types'

export interface UIStore {
  view: EditorView
  setView: (v: EditorView) => void
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  setLeftPanelOpen: (v: boolean) => void
  setRightPanelOpen: (v: boolean) => void
  aiPanelOpen: boolean
  setAIPanelOpen: (v: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  /** When set, opening the dashboard shows this project in the editor. */
  pendingOpenId: string | null
  setPendingOpenId: (id: string | null) => void
}

export const useUI = create<UIStore>()((set) => ({
  view: 'image',
  setView: (v) => set({ view: v }),
  leftPanelOpen: true,
  rightPanelOpen: true,
  setLeftPanelOpen: (v) => set({ leftPanelOpen: v }),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
  aiPanelOpen: false,
  setAIPanelOpen: (v) => set({ aiPanelOpen: v }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  pendingOpenId: null,
  setPendingOpenId: (id) => set({ pendingOpenId: id }),
}))
