export type ProjectType = 'image' | 'video' | 'graphics' | 'social'
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5'
export type ProjectStatus = 'draft' | 'completed'

/** Common base for all elements that can live on the editing canvas. */
export interface BaseElement {
  id: string
  type: string
  name: string
  locked: boolean
  hidden: boolean
  z: number
}

export interface ProjectElement extends BaseElement {
  // position / size on canvas
  x: number
  y: number
  width: number
  height: number
  // text elements
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: string | number
  fontStyle?: string
  color?: string
  opacity?: number
  textAlign?: 'left' | 'center' | 'right'
  // image elements
  src?: string
  mediaId?: string
  // shape elements
  fill?: string
  cornerRadius?: number
  points?: Array<[number, number]>
  /** Custom params for more complex elements (filters, music, etc.) */
  params?: Record<string, unknown>
}

export interface Clip {
  id: string
  trackId: string
  /** start offset in seconds on the timeline */
  start: number
  /** duration in seconds */
  duration: number
  /** internal source media info */
  mediaId?: string
  src?: string
  name?: string
  /** pre-set playback rate (preview only) */
  rate?: number
}

export interface Track {
  id: string
  name: string
  type: 'video' | 'audio' | 'image' | 'text'
}

export interface Project {
  id: string
  /** Local account that owns this project. Optional for legacy projects. */
  ownerId?: string
  name: string
  type: ProjectType
  aspectRatio: AspectRatio
  createdAt: number
  updatedAt: number
  status: ProjectStatus
  canvasWidth: number
  canvasHeight: number
  /** primary background color (hex) */
  background: string
  elements: ProjectElement[]
  clips: Clip[]
  tracks: Track[]
}

export interface MediaItem {
  id: string
  /** Local account that owns this media item. Optional for legacy items. */
  ownerId?: string
  name: string
  type: string // mime, e.g. video/mp4, image/png
  size: number
  createdAt: number
  /** base64 data url for small files; blob url for large ones */
  src?: string
  thumbnail?: string
}

export interface AppSettings {
  theme: 'dark' | 'light'
  language: 'en' | 'sw'
  aiProvider: string
  aiModel: string
  aiApiKey: string
  exportFormat: 'png' | 'jpeg' | 'webp'
  exportQuality: number
  shortcuts: Record<string, string>
}

export type EditorView = 'image' | 'video' | 'graphics'

export interface EditorState {
  view: EditorView
  elements: ProjectElement[]
  clips: Clip[]
  playing: boolean
  time: number // video preview time in seconds
  volume: number
  playbackRate: number
  timelineZoom: number
  playheadX: number
  selectedElementId?: string
  selectedClipId?: string
}

export interface Template {
  id: string
  name: string
  description: string
  category: string
  style: string
  aspectRatio: AspectRatio
  /** Element definitions used when a template is applied. */
  elements: Array<Pick<ProjectElement, 'type' | 'text' | 'x' | 'y' | 'width' | 'height' | 'color' | 'fill' | 'fontSize' | 'fontWeight'>>
  /** Original layout concept, used for the library preview card. */
  layoutPreview?: { colors: string[]; shapeCount: number; textLines: string[] }
}
