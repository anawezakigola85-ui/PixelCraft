/**
 * Project persistence helpers on top of the IndexedDB wrapper.
 */

import { db } from './db'
import { v4 } from '../store/ids'
import type { Project, AspectRatio, ProjectType, MediaItem, Clip } from './types'
import { sanitizeObj, sanitizeProjectName, validateProject } from './sanitize'

export const ASPECT_RATIOS: Record<AspectRatio, { w: number; h: number; label: string }> = {
  '16:9': { w: 1920, h: 1080, label: '16:9' },
  '9:16': { w: 1080, h: 1920, label: '9:16' },
  '1:1': { w: 1080, h: 1080, label: '1:1' },
  '4:5': { w: 1080, h: 1350, label: '4:5' },
}

export const CANVAS_BY_TYPE: Record<ProjectType, { w: number; h: number }> = {
  image: { w: 1280, h: 720 },
  video: { w: 1080, h: 1920 },
  graphics: { w: 1080, h: 1350 },
  social: { w: 1080, h: 1080 },
}

/** Picks the next free "Project N" name so new projects never collide. */
export function nextProjectName(projects: Array<{ name: string }>): string {
  const used = new Set(projects.map((p) => p.name.trim().toLowerCase()))
  let n = 1
  while (used.has(`project ${n}`)) n += 1
  return `Project ${n}`
}

export function newProject(
  name: string,
  type: ProjectType,
  aspectRatio: AspectRatio = '16:9',
  ownerId?: string,
): Project {
  // Aspect ratio wins when supplied, so templates and new-project dialogs get
  // the exact canvas they asked for instead of a fixed per-type size.
  const size = ASPECT_RATIOS[aspectRatio] || CANVAS_BY_TYPE[type]
  const id = v4()
  const now = Date.now()
  return {
    id,
    ownerId,
    name: name || `Project ${(now).toString().slice(-5)}`,
    type,
    aspectRatio,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    canvasWidth: size.w,
    canvasHeight: size.h,
    background: '#0a0a12',
    elements: [],
    clips: [] as Clip[],
    tracks: [
      { id: `track-v-${id.slice(-6)}`, name: 'Video', type: 'video' },
      { id: `track-a-${id.slice(-6)}`, name: 'Audio', type: 'audio' },
      { id: `track-t-${id.slice(-6)}`, name: 'Text', type: 'text' },
    ],
  } as Project
}

export async function saveProject(project: Project) {
  project.updatedAt = Date.now()
  await db.put('projects', project)
  return project
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.get<Project>('projects', id)
}

export async function getAllProjects(): Promise<Project[]> {
  const all = await db.getAll<Project>('projects')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteProject(id: string) {
  await db.delete('projects', id)
}

export async function duplicateProject(project: Project): Promise<Project> {
  const copy: Project = JSON.parse(JSON.stringify({ ...project, id: v4() }))
  copy.name = `${project.name} copy`
  copy.createdAt = Date.now()
  copy.updatedAt = copy.createdAt
  await saveProject(copy)
  return copy
}

export async function renameProject(project: Project, name: string) {
  return saveProject({ ...project, name: name.trim() || project.name })
}

export async function searchProjects(query: string, projects: Project[]): Promise<Project[]> {
  const q = query.trim().toLowerCase()
  if (!q) return projects
  return projects.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.elements ?? []).some((e) => e.text?.toLowerCase().includes(q)),
  )
}

/** Store media (files) in IndexedDB. Small files use base64 data URLs. */
export async function saveMedia(name: string, type: string, dataUrl: string, ownerId?: string): Promise<MediaItem> {
  const id = v4()
  const item: MediaItem = { id, ownerId, name, type, size: Math.floor(dataUrl.length * 0.75), createdAt: Date.now(), src: dataUrl }
  await db.put('media', item)
  return item
}

export async function getAllMedia(userId?: string): Promise<MediaItem[]> {
  const all = await db.getAll<MediaItem>('media')
  return all
    .filter((item) => !item.ownerId || item.ownerId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function makeImportName(file: File): string {
  const ts = new Date().toLocaleString()
  return `${file.name.replace(/\.[^.]+$/, '')}-${ts.replace(/[:/ ]/g, '-')}${file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''}`
}

/** Import a whole project from a JSON file. */
export async function importProjectFile(file: File, ownerId?: string): Promise<Project | null> {
  const text = await file.text()
  if (text.length > 5_000_000) throw new Error('File too large to import')
  const parsed = sanitizeObj(JSON.parse(text) as Record<string, unknown>)
  if (!validateProject(parsed)) throw new Error('Invalid project file (missing required fields)')
  const p = parsed as unknown as Partial<Project>
  const project: Project = {
    id: v4(),
    ownerId,
    name: sanitizeProjectName(String(p.name || `Imported ${file.name}`)),
    type: (p.type as Project['type']) || 'image',
    aspectRatio: (p.aspectRatio as Project['aspectRatio']) || '16:9',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: p.status || 'draft',
    canvasWidth: Math.min(Number(p.canvasWidth) || 1080, 4096),
    canvasHeight: Math.min(Number(p.canvasHeight) || 1080, 4096),
    background: typeof p.background === 'string' ? p.background.slice(0, 64) : '#0a0a12',
    elements: Array.isArray(p.elements) ? sanitizeObj(p.elements as Project['elements']) : [],
    clips: Array.isArray(p.clips) ? sanitizeObj(p.clips as Project['clips']) : [],
    tracks: Array.isArray(p.tracks) ? sanitizeObj(p.tracks as Project['tracks']) : [],
  }
  await saveProject(project)
  return project
}

export function exportProjectFile(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `${project.name}.pixelcraft.json`)
}
