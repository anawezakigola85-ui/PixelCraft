import { create } from 'zustand'
import type { ProjectElement, EditorState, Clip } from '../lib/types'
import { v4 } from './ids'

export interface EditorSnapshot {
  elements: ProjectElement[]
  clips: Clip[]
  selectedElementId?: string
  selectedClipId?: string
}

export interface EditorStore extends EditorState {
  selectedProjectId: string | null
  /** Minimal undo/redo history for canvas + timeline content changes. */
  history: EditorSnapshot[]
  future: EditorSnapshot[]
  undo: () => void
  redo: () => void
  // elements
  addElement: (el: Omit<Partial<ProjectElement>, 'id'>) => string
  removeElement: (id: string) => void
  updateElement: (id: string, patch: Partial<ProjectElement>) => void
  moveElement: (id: string, toTop: boolean) => void
  toggleLock: (id: string) => void
  toggleHidden: (id: string) => void
  duplicateElement: (id: string) => string
  clearSelection: () => void
  // video timeline
  addClip: (clip: Omit<Clip, 'id'>) => string
  moveClip: (id: string, newStart: number) => void
  resizeClip: (id: string, duration: number) => void
  trimClip: (id: string, start: number, duration: number) => void
  deleteClip: (id: string) => void
  splitClip: (clipId: string, atTime: number) => void
  setSelectedClip: (id: string | null) => void
  setSelectedElementId: (id: string | undefined) => void
  // playback
  togglePlay: () => void
  setTime: (t: number) => void
  setVolume: (v: number) => void
  setPlaybackRate: (r: number) => void
  setTimelineZoom: (z: number) => void
}

const HISTORY_LIMIT = 50

function snapshot(s: EditorStore): EditorSnapshot {
  return {
    elements: s.elements ?? [],
    clips: s.clips ?? [],
    selectedElementId: s.selectedElementId,
    selectedClipId: s.selectedClipId,
  }
}

/** Record the state *before* a content mutation, and invalidate redo. */
function remember(s: EditorStore) {
  return {
    history: [...s.history, snapshot(s)].slice(-HISTORY_LIMIT),
    future: [] as EditorSnapshot[],
  }
}

function nextZ(elements: ProjectElement[]) {
  return elements.reduce((max, el) => Math.max(max, Number(el.z) || 0), 0) + 1
}

export const useEditor = create<EditorStore>()((set, get) => ({
  selectedProjectId: null,
  elements: [] as ProjectElement[],
  clips: [] as Clip[],
  view: 'graphics',
  playing: false,
  time: 0,
  volume: 1,
  playbackRate: 1,
  timelineZoom: 1,
  playheadX: 0,
  selectedElementId: undefined,
  selectedClipId: undefined,
  history: [] as EditorSnapshot[],
  future: [] as EditorSnapshot[],

  setSelectedProjectId: (id: string | null) => set({ selectedProjectId: id }),
  clearSelection: () => set({ selectedElementId: undefined, selectedClipId: undefined }),

  undo: () =>
    set((s) => {
      const previous = s.history[s.history.length - 1]
      if (!previous) return s
      return {
        ...previous,
        history: s.history.slice(0, -1),
        future: [snapshot(s), ...s.future].slice(0, HISTORY_LIMIT),
      }
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return s
      return {
        ...next,
        history: [...s.history, snapshot(s)].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
      }
    }),

  addElement: (el) => {
    const id = v4()
    const z = nextZ(get().elements ?? [])
    const full: ProjectElement = {
      type: 'shape',
      name: '',
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      ...(el as Partial<ProjectElement>),
      id,
      z,
      locked: false,
      hidden: false,
    }
    set((s) => ({ ...remember(s), elements: [...(s.elements ?? []), full] }))
    return id
  },
  removeElement: (id) =>
    set((s) => {
      const selected = s.selectedElementId === id
      return {
        ...remember(s),
        elements: (s.elements ?? []).filter((e) => e.id !== id),
        selectedElementId: selected ? undefined : s.selectedElementId,
      }
    }),
  updateElement: (id, patch) =>
    set((s) => ({
      ...remember(s),
      elements: (s.elements ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  moveElement: (id, toTop) =>
    set((s) => {
      // Clone objects before reindexing so earlier undo snapshots stay intact.
      const els = (s.elements ?? []).map((e) => ({ ...e }))
      const i = els.findIndex((e) => e.id === id)
      if (i >= 0) {
        const [el] = els.splice(i, 1)
        if (toTop) els.push(el)
        else els.splice(0, 0, el)
        els.forEach((e, idx) => (e.z = idx))
      }
      return { ...remember(s), elements: els }
    }),
  toggleLock: (id) =>
    set((s) => ({
      ...remember(s),
      elements: (s.elements ?? []).map((e) => (e.id === id ? { ...e, locked: !e.locked } : e)),
    })),
  toggleHidden: (id) =>
    set((s) => ({
      ...remember(s),
      elements: (s.elements ?? []).map((e) => (e.id === id ? { ...e, hidden: !e.hidden } : e)),
    })),
  duplicateElement: (id) => {
    const el = get().elements.find((e) => e.id === id)
    if (!el) return ''
    const cloneId = v4()
    set((s) => ({
      ...remember(s),
      elements: [...(s.elements ?? []), { ...el, id: cloneId, z: nextZ(s.elements ?? []) }],
    }))
    return cloneId
  },

  addClip: (clip) => {
    const id = v4()
    set((s) => ({ ...remember(s), clips: [...(s.clips ?? []), { id, ...clip }] }))
    return id
  },
  moveClip: (id, newStart) =>
    set((s) => ({
      ...remember(s),
      clips: (s.clips ?? []).map((c) => (c.id === id ? { ...c, start: Math.max(0, newStart) } : c)),
    })),
  resizeClip: (id, duration) =>
    set((s) => ({
      ...remember(s),
      clips: (s.clips ?? []).map((c) => (c.id === id ? { ...c, duration: Math.max(0.1, duration) } : c)),
    })),
  trimClip: (id, start, duration) =>
    set((s) => ({
      ...remember(s),
      clips: (s.clips ?? []).map((c) =>
        c.id === id ? { ...c, start: Math.max(0, start), duration: Math.max(0.1, duration) } : c,
      ),
    })),
  deleteClip: (id) =>
    set((s) => ({
      ...remember(s),
      clips: (s.clips ?? []).filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? undefined : s.selectedClipId,
    })),
  splitClip: (clipId, atTime) =>
    set((s) => ({
      ...remember(s),
      clips: (s.clips ?? []).flatMap((c) => {
        if (c.id !== clipId) return [c]
        const end = c.start + c.duration
        const right = { ...c, id: v4(), start: atTime, duration: Math.max(0.05, end - atTime) }
        return right.duration > 0.05 ? [{ ...c, duration: Math.max(0.05, atTime - c.start) }, right] : [c]
      }),
    })),
  setSelectedClip: (id) => set({ selectedClipId: id ?? undefined }),
  setSelectedElementId: (id) => set({ selectedElementId: id }),

  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setTime: (t) => set({ time: Math.max(0, t) }),
  setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),
  setPlaybackRate: (r) => set({ playbackRate: Math.min(4, Math.max(0.1, r)) }),
  setTimelineZoom: (z) => set({ timelineZoom: Math.min(3, Math.max(0.5, z)) }),
}))
