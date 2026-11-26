/**
 * Zustand store over lib/projects persistence. Holds the current project,
 * project list, and auto-saves with a debounce.
 */

import { create } from 'zustand'
import {
  newProject,
  saveProject,
  renameProject,
  duplicateProject as dupProject,
  deleteProject as delProject,
  importProjectFile,
  exportProjectFile,
  getProject,
  getAllProjects,
} from '../lib/projects'
import { getSession } from '../lib/auth'
import type { Project, ProjectType, AspectRatio } from '../lib/types'

let saveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSave(save: () => Promise<void>) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void save()
  }, 400)
}

/** Legacy items without an owner stay visible so existing local data is not lost. */
function visibleToUser<T extends { ownerId?: string }>(item: T, userId?: string): boolean {
  return !item.ownerId || item.ownerId === userId
}

async function currentUserId(): Promise<string | undefined> {
  return (await getSession())?.userId
}

export interface ProjectsStore {
  projects: Project[]
  current: Project | null
  loadProjects: () => Promise<void>
  loadCurrent: (id: string | null) => Promise<void>
  createProject: (name: string, type: ProjectType, aspectRatio?: AspectRatio) => Promise<Project>
  renameProject: (name: string) => Promise<void>
  duplicateProject: () => Promise<void>
  deleteProject: () => Promise<void>
  importProject: () => Promise<void>
  exportProject: () => void
  saveCurrent: () => Promise<void>
  updateCurrent: (patch: Partial<Project>) => void
  openProject: (id: string) => Promise<void>
}

export const useProjects = create<ProjectsStore>()((set, get) => ({
  projects: [],
  current: null,

  loadProjects: async () => {
    const [all, userId] = await Promise.all([getAllProjects(), currentUserId()])
    set({ projects: all.filter((project) => visibleToUser(project, userId)) })
  },
  loadCurrent: async (id) => {
    const [found, userId] = await Promise.all([id ? getProject(id) : Promise.resolve(undefined), currentUserId()])
    const current = found && visibleToUser(found, userId) ? found : null
    if (current) {
      set((s) => ({
        current,
        projects: s.projects.some((p) => p.id === current.id)
          ? s.projects.map((p) => (p.id === current.id ? current : p))
          : [current, ...s.projects],
      }))
    } else {
      set({ current: null })
    }
  },
  createProject: async (name, type, aspectRatio = '16:9') => {
    const p = newProject(name, type, aspectRatio, await currentUserId())
    await saveProject(p)
    set((s) => ({ current: p, projects: [p, ...s.projects] }))
    return p
  },
  renameProject: async (name) => {
    const current = get().current
    if (!current) return
    const renamed = await renameProject(current, name)
    set((s) => ({ current: renamed, projects: s.projects.map((p) => (p.id === renamed.id ? renamed : p)) }))
  },
  duplicateProject: async () => {
    const current = get().current
    if (!current) return
    const copy = await dupProject(current)
    copy.ownerId = await currentUserId()
    await saveProject(copy)
    set((s) => ({ current: copy, projects: [copy, ...s.projects] }))
  },
  deleteProject: async () => {
    const current = get().current
    if (!current) return
    await delProject(current.id)
    set((s) => ({ projects: s.projects.filter((p) => p.id !== current.id), current: null }))
  },
  importProject: async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pixelcraft.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const project = await importProjectFile(file, await currentUserId())
      if (!project) return
      await get().loadProjects()
      set({ current: project })
    }
    input.click()
  },
  exportProject: () => {
    const current = get().current
    if (current) exportProjectFile(current)
  },
  saveCurrent: async () => {
    const current = get().current
    if (current) await saveProject(current)
  },
  updateCurrent: (patch) => {
    const current = get().current
    if (!current) return
    const updated = { ...current, ...patch, updatedAt: Date.now() }
    set((s) => ({ current: updated, projects: s.projects.map((p) => (p.id === updated.id ? updated : p)) }))
    debouncedSave(get().saveCurrent)
  },
  openProject: async (id) => {
    const [p, userId] = await Promise.all([getProject(id), currentUserId()])
    if (p && visibleToUser(p, userId)) set({ current: p })
  },
}))

/** Store a media file via the projects store (persistence passthrough). */
export async function storeMediaFile(file: File): Promise<string> {
  const { saveMedia, fileToDataURL, makeImportName } = await import('../lib/projects')
  const dataUrl = await fileToDataURL(file)
  const item = await saveMedia(makeImportName(file), file.type, dataUrl, await currentUserId())
  return item.id
}
