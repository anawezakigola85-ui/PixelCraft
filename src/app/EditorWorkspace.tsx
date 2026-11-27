import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Undo2, Redo2, Scissors, LayoutGrid, Columns2, PanelRight, Monitor, Settings, Download,
  Search, Star, Plus, Video, Film, Music2, Type, Shapes, Palette, Sparkles, Play, Pause,
  SkipBack, SkipForward, Volume2, VolumeX, Maximize2, ChevronDown, ChevronRight,
  Lock, Eye, Trash2, Copy, Snowflake, ZoomIn, ZoomOut, Upload,
  Image as ImageIcon, Layers, Wand2, Crop, Gauge, SlidersHorizontal, Check, X,
  AlignLeft, AlignCenter, AlignRight, Bold,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import DesignPreview from '../components/ui/DesignPreview'
import { navigate } from './Router'
import { useEditor } from '../store/editor'
import { useProjects, storeMediaFile } from '../store/projectsStore'
import { useAuth } from '../store/authStore'
import { getAllMedia } from '../lib/projects'
import { exportVideo, type ExportFormat } from '../lib/exportVideo'
import { designToDataUrl } from '../lib/previewSvg'
import { TEMPLATES } from '../data/templates'
import type { AspectRatio, Clip, MediaItem, Project, ProjectElement, Template } from '../lib/types'
import { v4 } from '../store/ids'

/* Exact pro-editor palette from the design spec. */
const C = {
  bg: '#0B0C10',
  stage: '#090A0F',
  panel: '#13151C',
  panel2: '#171922',
  border: '#222530',
  purple: '#7C3AED',
  cyan: '#00E5FF',
  text: '#EEF1F8',
  muted: '#7E8497',
} as const

type RailPanel = 'media' | 'stock' | 'audio' | 'text' | 'elements' | 'transitions' | 'filters' | 'brand'
type InspectorTab = 'Video' | 'Audio' | 'Text' | 'Adjust'
type AssetKind = 'image' | 'video' | 'audio' | 'template' | 'text' | 'shape' | 'transition'

interface Asset {
  id: string
  name: string
  kind: AssetKind
  src?: string
  thumbnail?: string
  gradient?: string
  label: string
  template?: Template
  textPreset?: {
    text: string
    fontSize: number
    color: string
    fontWeight: number
    textAlign: 'left' | 'center' | 'right'
  }
  shape?: 'rect' | 'circle' | 'line'
  transition?: string
}

const RAIL: Array<{ id: RailPanel; label: string; icon: ReactNode }> = [
  { id: 'media', label: 'Media', icon: <Video className="h-4 w-4" /> },
  { id: 'stock', label: 'Stock', icon: <Film className="h-4 w-4" /> },
  { id: 'audio', label: 'Audio', icon: <Music2 className="h-4 w-4" /> },
  { id: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
  { id: 'elements', label: 'Elements', icon: <Shapes className="h-4 w-4" /> },
  { id: 'transitions', label: 'Transitions', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'filters', label: 'Filters', icon: <Palette className="h-4 w-4" /> },
  { id: 'brand', label: 'Brand', icon: <Layers className="h-4 w-4" /> },
]

const EFFECTS: Array<{ name: string; filter: string }> = [
  { name: 'None', filter: 'none' },
  { name: 'Vintage', filter: 'sepia(0.45) contrast(1.1)' },
  { name: 'Cinema', filter: 'contrast(1.25) saturate(0.85)' },
  { name: 'Neon', filter: 'saturate(1.8) contrast(1.2)' },
  { name: 'Glitch', filter: 'hue-rotate(35deg) contrast(1.3)' },
  { name: 'Fade', filter: 'opacity(0.82)' },
  { name: 'B&W', filter: 'grayscale(1)' },
  { name: 'Warm', filter: 'sepia(0.2) saturate(1.35)' },
]

const TEXT_PRESETS: Asset[] = [
  { id: 'text-heading', name: 'Bold Heading', kind: 'text', label: 'TEXT', textPreset: { text: 'YOUR HEADLINE', fontSize: 104, color: '#FFFFFF', fontWeight: 800, textAlign: 'center' } },
  { id: 'text-subtitle', name: 'Subtitle', kind: 'text', label: 'TEXT', textPreset: { text: 'Add a supporting line', fontSize: 56, color: C.cyan, fontWeight: 600, textAlign: 'center' } },
  { id: 'text-lower-third', name: 'Lower Third', kind: 'text', label: 'TEXT', textPreset: { text: 'NAME · TITLE', fontSize: 48, color: C.purple, fontWeight: 700, textAlign: 'left' } },
  { id: 'text-caption', name: 'Caption', kind: 'text', label: 'TEXT', textPreset: { text: 'Captivate your audience', fontSize: 42, color: '#FFFFFF', fontWeight: 500, textAlign: 'center' } },
]

const SHAPE_PRESETS: Asset[] = [
  { id: 'shape-rect', name: 'Rectangle', kind: 'shape', label: 'SHAPE', shape: 'rect' },
  { id: 'shape-circle', name: 'Circle', kind: 'shape', label: 'SHAPE', shape: 'circle' },
  { id: 'shape-line', name: 'Line', kind: 'shape', label: 'SHAPE', shape: 'line' },
]

const TRANSITION_PRESETS: Asset[] = [
  { id: 'transition-fade', name: 'Fade', kind: 'transition', label: 'FX', transition: 'fade' },
  { id: 'transition-slide', name: 'Slide', kind: 'transition', label: 'FX', transition: 'slide' },
  { id: 'transition-zoom', name: 'Zoom', kind: 'transition', label: 'FX', transition: 'zoom' },
  { id: 'transition-wipe', name: 'Wipe', kind: 'transition', label: 'FX', transition: 'wipe' },
]

const ASPECTS: AspectRatio[] = ['9:16', '16:9', '1:1', '4:5']
const FONT_OPTIONS = ["'Inter', sans-serif", "'Georgia', serif", "'Courier New', monospace", "'Arial', sans-serif"]

function fmtTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function fullElement(partial: Partial<ProjectElement> & { type: string }, z: number): ProjectElement {
  return {
    ...partial,
    id: partial.id || v4(),
    name: partial.name || partial.type,
    x: partial.x ?? 120,
    y: partial.y ?? 120,
    width: partial.width ?? 400,
    height: partial.height ?? 120,
    z,
    locked: partial.locked ?? false,
    hidden: partial.hidden ?? false,
  } as ProjectElement
}

function IconButton({
  label, onClick, active, children, disabled,
}: { label: string; onClick: () => void; active?: boolean; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md transition disabled:opacity-35"
      style={{
        color: active ? C.cyan : C.muted,
        background: active ? `${C.purple}33` : 'transparent',
        border: active ? `1px solid ${C.purple}` : '1px solid transparent',
      }}
    >
      {children}
    </button>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="border-b" style={{ borderColor: C.border }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide"
        style={{ color: C.text }}
      >
        <span style={{ color: C.cyan }}>{icon}</span>
        <span className="flex-1">{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" style={{ color: C.muted }} /> : <ChevronRight className="h-3.5 w-3.5" style={{ color: C.muted }} />}
      </button>
      {open && <div className="space-y-3 px-3 pb-3">{children}</div>}
    </section>
  )
}

function Slider({
  label, value, min, max, step = 1, suffix = '', onChange, disabled,
}: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[10px]" style={{ color: C.muted }}>
        <span>{label}</span>
        <span style={{ color: C.text }}>{Number.isInteger(value) ? value : value.toFixed(2)}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full disabled:opacity-40"
        style={{ accentColor: C.cyan }}
        aria-label={label}
      />
    </label>
  )
}

export default function EditorWorkspace() {
  const project = useProjects((s) => s.current)
  const clips = useEditor((s) => s.clips)
  const elements = useEditor((s) => s.elements)
  const playing = useEditor((s) => s.playing)
  const time = useEditor((s) => s.time)
  const volume = useEditor((s) => s.volume)
  const selectedClipId = useEditor((s) => s.selectedClipId)
  const selectedElementId = useEditor((s) => s.selectedElementId)
  const zoom = useEditor((s) => s.timelineZoom)
  const { session } = useAuth()

  const [aspect, setAspect] = useState<AspectRatio>(project?.aspectRatio || '9:16')
  const [rail, setRail] = useState<RailPanel>('media')
  const [tab, setTab] = useState<InspectorTab>('Video')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [media, setMedia] = useState<Asset[]>([])
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [color, setColor] = useState<string>(C.purple)
  const [brandColors, setBrandColors] = useState<string[]>([C.purple, C.cyan, '#22c55e', '#f59e0b'])
  const [brandFont, setBrandFont] = useState(FONT_OPTIONS[0])
  const [exportFormat, setExportFormat] = useState('MP4')
  const [resolution, setResolution] = useState('1080p')
  const [frameRate, setFrameRate] = useState('30 fps')
  const [quality, setQuality] = useState(85)
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState('')
  const [frozen, setFrozen] = useState(false)
  const [history, setHistory] = useState<Clip[][]>([])
  const [future, setFuture] = useState<Clip[][]>([])

  const stageRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dragRef = useRef<{ id: string; startX: number; originalStart: number } | null>(null)

  const templateAssets = useMemo<Asset[]>(
    () => TEMPLATES.map((tp) => ({
      id: `tpl-${tp.id}`,
      name: tp.name,
      kind: 'template',
      label: tp.category === 'TikTok' || tp.category === 'Canva' || tp.category === 'CapCut'
        ? tp.category.toUpperCase()
        : tp.category.toUpperCase().slice(0, 8),
      template: tp,
      thumbnail: designToDataUrl(tp),
    })),
    [],
  )

  const duration = useMemo(() => {
    const end = clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0)
    return Math.max(30, Math.ceil(end / 5) * 5 + 5)
  }, [clips])

  const playheadClip = clips.find((c) => time >= c.start && time < c.start + c.duration)
  const previewClip = playheadClip?.src && !playheadClip.src.startsWith('data:image/svg+xml') ? playheadClip : undefined
  const selectedClip = clips.find((c) => c.id === selectedClipId)
  const selectedElement = elements.find((e) => e.id === selectedElementId)
  const selectedText = selectedElement?.type === 'text' ? selectedElement : undefined
  const effects = project?.effects || {}

  const filterString = useMemo(() => {
    const parts: string[] = []
    if (effects.filter && effects.filter !== 'none') parts.push(effects.filter)
    if ((effects.brightness ?? 1) !== 1) parts.push(`brightness(${effects.brightness})`)
    if ((effects.contrast ?? 1) !== 1) parts.push(`contrast(${effects.contrast})`)
    if ((effects.saturation ?? 1) !== 1) parts.push(`saturate(${effects.saturation})`)
    return parts.join(' ') || 'none'
  }, [effects])

  const pxPerSecond = (58 * zoom) / 5
  const playheadPercent = Math.min(100, (time / duration) * 100)

  const refreshMedia = useCallback(async () => {
    const items = await getAllMedia(session?.userId)
    const uploads: Asset[] = items.map((item: MediaItem) => {
      const kind: AssetKind = item.type.startsWith('video') ? 'video' : item.type.startsWith('audio') ? 'audio' : 'image'
      return {
        id: item.id,
        name: item.name,
        kind,
        src: item.src,
        thumbnail: item.thumbnail || (kind === 'image' ? item.src : undefined),
        gradient: 'linear-gradient(135deg,#312e81,#0e7490)',
        label: kind.toUpperCase(),
      }
    })
    setMedia(uploads)
  }, [session?.userId])

  useEffect(() => { void useProjects.getState().loadProjects() }, [])
  useEffect(() => { void refreshMedia() }, [refreshMedia])

  useEffect(() => {
    if (!project) return
    const ed = useEditor.getState()
    if (ed.selectedProjectId !== project.id) {
      useEditor.setState({ selectedProjectId: project.id, elements: project.elements, clips: project.clips })
    }
    setAspect(project.aspectRatio)
    if (project.brand?.colors?.length) setBrandColors(project.brand.colors)
    if (project.brand?.font) setBrandFont(project.brand.font)
    setColor(project.brand?.colors?.[0] || C.purple)
  }, [project])

  useEffect(() => {
    if (!playing || frozen) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const ed = useEditor.getState()
      const next = ed.time + dt * ed.playbackRate
      if (next >= duration) {
        ed.setTime(0)
        ed.togglePlay()
        return
      }
      ed.setTime(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, frozen, duration])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !previewClip?.src) return
    const local = Math.max(0, time - previewClip.start)
    if (Math.abs(v.currentTime - local) > 0.25) v.currentTime = local
    if (playing) void v.play().catch(() => {})
    else v.pause()
  }, [time, playing, previewClip?.id, previewClip?.start, previewClip?.src])

  const persistEditor = useCallback((extra: Partial<Project> = {}) => {
    const p = useProjects.getState().current
    if (!p) return
    void useProjects.getState().updateCurrent({
      elements: [...useEditor.getState().elements],
      clips: [...useEditor.getState().clips],
      ...extra,
    })
  }, [])

  const snapshot = useCallback(() => {
    setHistory((h) => [...h.slice(-29), useEditor.getState().clips.map((c) => ({ ...c }))])
    setFuture([])
  }, [])

  const persistClips = useCallback((next: Clip[]) => {
    useEditor.setState({ clips: next })
    const p = useProjects.getState().current
    if (p) void useProjects.getState().updateCurrent({ clips: next })
  }, [])

  const undo = () => {
    if (!history.length) return
    const prev = history[history.length - 1]
    setFuture((f) => [useEditor.getState().clips, ...f])
    setHistory((h) => h.slice(0, -1))
    persistClips(prev)
    setStatus('Undid last edit')
  }

  const redo = () => {
    if (!future.length) return
    const next = future[0]
    setHistory((h) => [...h, useEditor.getState().clips])
    setFuture((f) => f.slice(1))
    persistClips(next)
    setStatus('Redid edit')
  }

  const ensureProject = async (): Promise<Project> => {
    const existing = useProjects.getState().current
    if (existing) return existing
    return await useProjects.getState().createProject('Studio Project', 'video', aspect)
  }

  const addAsset = async (asset: Asset) => {
    const p = await ensureProject()
    snapshot()
    const ed = useEditor.getState()
    const nextClips = [...ed.clips]
    const nextElements = [...ed.elements]
    let chooseElement: string | undefined
    let message = ''

    if (asset.kind === 'transition') {
      if (!selectedClipId) { setStatus('Select a clip on the timeline first'); return }
      const next = nextClips.map((c) => c.id === selectedClipId ? { ...c, params: { ...(c.params || {}), transition: asset.transition } } : c)
      persistClips(next)
      setStatus(`${asset.name} transition applied to selected clip`)
      return
    }

    if (asset.template) {
      const newElements = asset.template.elements.map((el, i) => fullElement({
        ...el,
        name: el.type === 'text' ? `Text: ${(el.text || '').slice(0, 16)}` : `Shape ${i + 1}`,
      }, Date.now() + i))
      nextElements.push(...newElements)
      chooseElement = newElements[0]?.id
      nextClips.push({
        id: v4(), trackId: 'track-overlay', start: 0, duration: 6,
        name: asset.name, src: asset.thumbnail, params: { transition: 'fade' },
      })
      message = `“${asset.name}” added with ${newElements.length} editable layers`
    } else if (asset.kind === 'text' && asset.textPreset) {
      const preset = asset.textPreset
      const el = fullElement({
        type: 'text', name: asset.name, text: preset.text,
        x: Math.round(p.canvasWidth * 0.1), y: Math.round(p.canvasHeight * (preset.textAlign === 'left' ? 0.72 : 0.42)),
        width: Math.round(p.canvasWidth * 0.8), height: Math.round(preset.fontSize * 1.5),
        fontSize: preset.fontSize, color: preset.color, fontWeight: preset.fontWeight,
        textAlign: preset.textAlign, fontFamily: project?.brand?.font || FONT_OPTIONS[0],
      }, Date.now())
      nextElements.push(el)
      chooseElement = el.id
      nextClips.push({ id: v4(), trackId: 'track-captions', start: 0, duration: 4, name: preset.text, params: {} })
      message = `Text layer “${preset.text}” added and selected`
    } else if (asset.kind === 'shape') {
      const el = fullElement({
        type: 'shape', name: asset.name,
        x: Math.round(p.canvasWidth * 0.35), y: Math.round(p.canvasHeight * 0.38),
        width: Math.round(p.canvasWidth * 0.3), height: asset.shape === 'line' ? 12 : Math.round(p.canvasWidth * 0.3),
        fill: color, cornerRadius: asset.shape === 'rect' ? 24 : 0,
        params: { shape: asset.shape || 'rect' },
      }, Date.now())
      nextElements.push(el)
      chooseElement = el.id
      const thumb = designToDataUrl({ aspectRatio: p.aspectRatio, background: 'transparent', elements: [el] }, true)
      nextClips.push({ id: v4(), trackId: 'track-overlay', start: 0, duration: 4, name: asset.name, src: thumb, params: {} })
      message = `${asset.name} shape added and selected`
    } else {
      const trackId = asset.kind === 'audio' ? 'track-audio' : asset.kind === 'video' ? 'track-video' : 'track-overlay'
      const start = nextClips.filter((c) => c.trackId === trackId).reduce((max, c) => Math.max(max, c.start + c.duration), 0)
      const fallback = asset.kind === 'audio' ? 10 : asset.kind === 'video' ? 6 : 5
      const clip: Clip = { id: v4(), trackId, start, duration: fallback, name: asset.name, src: asset.src, params: {} }
      nextClips.push(clip)
      message = `“${asset.name}” added to the ${trackId.replace('track-', '')} track`

      if ((asset.kind === 'video' || asset.kind === 'audio') && asset.src) {
        const probe = document.createElement(asset.kind === 'video' ? 'video' : 'audio')
        probe.preload = 'metadata'
        probe.src = asset.src
        probe.onloadedmetadata = () => {
          const d = Math.min(120, Math.max(1, Number(probe.duration) || fallback))
          const current = useEditor.getState().clips.map((c) => c.id === clip.id ? { ...c, duration: d } : c)
          useEditor.setState({ clips: current })
          persistEditor()
        }
      }
    }

    useEditor.setState({
      elements: nextElements,
      clips: nextClips,
      selectedElementId: chooseElement,
      selectedClipId: nextClips[nextClips.length - 1]?.id,
    })
    persistEditor()
    setStatus(message)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setStatus(`Uploading ${files.length} file(s)…`)
    try {
      for (const file of files) await storeMediaFile(file)
      await refreshMedia()
      setStatus(`${files.length} file(s) added to Media`)
    } catch (error) {
      setStatus(`Upload failed: ${(error as Error).message}`)
    }
    e.target.value = ''
  }

  const splitSelected = () => {
    const id = useEditor.getState().selectedClipId
    if (!id) { setStatus('Select a clip first, then split at the playhead'); return }
    snapshot()
    useEditor.getState().splitClip(id, time)
    persistClips([...useEditor.getState().clips])
    setStatus(`Split at ${fmtTime(time)}`)
  }

  const deleteSelected = () => {
    const id = useEditor.getState().selectedClipId
    if (!id) { setStatus('Select a clip to delete'); return }
    snapshot()
    useEditor.getState().deleteClip(id)
    useEditor.setState({ selectedClipId: undefined })
    persistClips([...useEditor.getState().clips])
    setStatus('Clip deleted')
  }

  const duplicateSelected = () => {
    const clip = clips.find((c) => c.id === selectedClipId)
    if (!clip) { setStatus('Select a clip to duplicate'); return }
    snapshot()
    const copy = { ...clip, id: v4(), start: clip.start + clip.duration }
    persistClips([...useEditor.getState().clips, copy])
    setStatus('Clip duplicated')
  }

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateSelectedElement = (patch: Partial<ProjectElement>, message?: string) => {
    if (!selectedElement) { setStatus('Select a layer in the preview first'); return }
    useEditor.getState().updateElement(selectedElement.id, patch)
    persistEditor()
    if (message) setStatus(message)
  }

  const patchElementParams = (patch: Record<string, unknown>) => {
    if (!selectedElement) { setStatus('Select a layer in the preview first'); return }
    updateSelectedElement({ params: { ...(selectedElement.params || {}), ...patch } })
  }

  const patchClipParams = (patch: Record<string, unknown>) => {
    if (!selectedClip) { setStatus('Select a clip on the timeline first'); return }
    const next = useEditor.getState().clips.map((c) => c.id === selectedClip.id ? { ...c, params: { ...(c.params || {}), ...patch } } : c)
    persistClips(next)
  }

  const patchEffects = (patch: Partial<NonNullable<Project['effects']>>) => {
    persistEditor({ effects: { ...effects, ...patch } })
  }

  const applyColor = (c: string) => {
    setColor(c)
    if (!selectedElement) {
      persistEditor({ background: c })
      setStatus(`Canvas background set to ${c}`)
      return
    }
    if (selectedElement.type === 'text') updateSelectedElement({ color: c }, 'Text colour updated')
    else if (selectedElement.type === 'shape') updateSelectedElement({ fill: c }, 'Shape colour updated')
    else patchElementParams({ color: c })
  }

  const applyEffect = (name: string, filter: string) => {
    patchEffects({ preset: name, filter })
    setStatus(`${name} filter applied`)
  }

  const setBrandFontAndApply = (font: string) => {
    setBrandFont(font)
    persistEditor({ brand: { colors: brandColors, font } })
    if (selectedText) updateSelectedElement({ fontFamily: font }, 'Font applied to selected text')
  }

  const saveBrand = () => {
    persistEditor({ brand: { colors: brandColors, font: brandFont } })
    setStatus('Brand kit saved to this project')
  }

  const assetsByPanel = useMemo<Record<RailPanel, Asset[]>>(() => ({
    media: [...media, ...templateAssets],
    stock: templateAssets,
    audio: media.filter((a) => a.kind === 'audio'),
    text: TEXT_PRESETS,
    elements: [...SHAPE_PRESETS, ...templateAssets],
    transitions: TRANSITION_PRESETS,
    filters: [],
    brand: [],
  }), [media, templateAssets])

  const visibleAssets = assetsByPanel[rail].filter((a) => {
    const q = query.trim().toLowerCase().replace(/cup[\s-]?cut/g, 'capcut')
    if (!q) return true
    const haystack = [
      a.name,
      a.label,
      a.template?.category,
      a.template?.style,
      ...(a.template?.elements.map((el) => el.text || '') || []),
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })

  const runExport = async () => {
    const p = useProjects.getState().current
    if (!p) { setStatus('Create or open a project before exporting'); return }
    setExporting(true)
    setStatus('Preparing export…')
    const isJson = exportFormat === 'Project JSON'
    const format: ExportFormat = exportFormat === 'WebM' ? 'WebM' : exportFormat === 'GIF' ? 'GIF' : 'MP4'
    try {
      const finalProject: Project = {
        ...p,
        elements: useEditor.getState().elements,
        clips: useEditor.getState().clips,
        effects,
      }
      const blob = isJson
        ? new Blob([JSON.stringify(finalProject, null, 2)], { type: 'application/json' })
        : await exportVideo({
          project: finalProject,
          format,
          resolution,
          fps: Number(frameRate.split(' ')[0]) || 30,
          quality,
          onProgress: setStatus,
        })
      if (!blob) {
        const json = new Blob([JSON.stringify(finalProject, null, 2)], { type: 'application/json' })
        triggerDownload(json, `${p.name}.pixelcraft.json`)
        setStatus('No decodable media — exported project JSON instead')
      } else {
        triggerDownload(blob, `${p.name}.${isJson ? 'pixelcraft.json' : format.toLowerCase()}`)
        setStatus(isJson ? 'Project JSON exported' : `${format} exported at ${resolution} / ${frameRate}`)
      }
    } catch (error) {
      setStatus(`Export failed: ${(error as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void stageRef.current?.requestFullscreen()
    else void document.exitFullscreen()
  }

  const onClipPointerDown = (e: React.PointerEvent<HTMLButtonElement>, clip: Clip) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { id: clip.id, startX: e.clientX, originalStart: clip.start }
    useEditor.getState().setSelectedClip(clip.id)
  }

  const onClipPointerMove = (e: React.PointerEvent<HTMLButtonElement>, clip: Clip) => {
    const drag = dragRef.current
    if (!drag || drag.id !== clip.id) return
    const nextStart = Math.max(0, drag.originalStart + (e.clientX - drag.startX) / pxPerSecond)
    const next = useEditor.getState().clips.map((c) => c.id === clip.id ? { ...c, start: nextStart } : c)
    useEditor.setState({ clips: next })
  }

  const onClipPointerUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    persistEditor()
    setStatus('Clip position updated')
  }

  const rulerTicks = Array.from({ length: Math.floor(duration / 5) + 1 }, (_, i) => i * 5)
  const stageScale = selectedElement ? 1 : scale
  const stageRotation = selectedElement ? 0 : rotation
  const stageOpacity = selectedElement ? 1 : opacity
  const previewDesign = {
    aspectRatio: aspect,
    background: project?.background || '#111318',
    elements,
  }

  const trackRows: Array<{ id: string; label: string; color: string; clips: Clip[]; kind: string }> = [
    { id: 'track-video', label: 'Video', color: C.purple, clips: clips.filter((c) => c.trackId === 'track-video'), kind: 'video' },
    { id: 'track-overlay', label: 'Overlay', color: '#3B82F6', clips: clips.filter((c) => c.trackId === 'track-overlay'), kind: 'overlay' },
    { id: 'track-audio', label: 'Audio', color: '#10B981', clips: clips.filter((c) => c.trackId === 'track-audio'), kind: 'audio' },
    { id: 'track-captions', label: 'Captions', color: '#00E5FF', clips: clips.filter((c) => c.trackId === 'track-captions'), kind: 'caption' },
  ]

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-hidden" style={{ background: C.bg, color: C.text }}>
      {/* 1. Top header — 48px */}
      <header className="flex h-12 shrink-0 items-center justify-between px-3" style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2" title="Back to dashboard">
            <Logo size={30} className="shrink-0" />
            <span className="font-display text-sm font-bold">Pixelcraft</span>
          </button>
          <span className="mx-1 h-5 w-px" style={{ background: C.border }} />
          <span className="max-w-[10rem] truncate text-[11px]" style={{ color: C.muted }} title={project?.name}>
            {project?.name || 'Untitled Studio'}
          </span>
          <span className="mx-1 h-5 w-px" style={{ background: C.border }} />
          <IconButton label="Undo" onClick={undo} disabled={!history.length}><Undo2 className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Redo" onClick={redo} disabled={!future.length}><Redo2 className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Split / Cut at playhead" onClick={splitSelected}><Scissors className="h-3.5 w-3.5" /></IconButton>
        </div>

        <div className="flex items-center gap-1">
          <IconButton label="Grid layout" onClick={() => setStatus('Grid layout active')} active><LayoutGrid className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Column layout" onClick={() => setStatus('Column layout active')}><Columns2 className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Inspector layout" onClick={() => setStatus('Inspector layout active')}><PanelRight className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Preview monitor" onClick={() => setStatus('Preview monitor active')}><Monitor className="h-3.5 w-3.5" /></IconButton>
          <span className="mx-1 h-5 w-px" style={{ background: C.border }} />
          {ASPECTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAspect(a)
                void useProjects.getState().updateCurrent({ aspectRatio: a })
                setStatus(`Canvas set to ${a}`)
              }}
              className="rounded px-1.5 py-1 text-[10px] font-semibold transition"
              style={{ background: aspect === a ? `${C.purple}33` : 'transparent', color: aspect === a ? C.cyan : C.muted, border: aspect === a ? `1px solid ${C.purple}` : '1px solid transparent' }}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <IconButton label="Settings" onClick={() => navigate('/settings')}><Settings className="h-3.5 w-3.5" /></IconButton>
          <button
            type="button"
            onClick={() => void runExport()}
            disabled={exporting}
            className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold text-white transition disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${C.purple}, #9333ea)` }}
          >
            <Download className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export'}
          </button>
          <IconButton label="Close studio" onClick={() => navigate('/')}><X className="h-3.5 w-3.5" /></IconButton>
        </div>
      </header>

      {/* Main workspace row */}
      <div className="flex min-h-0 flex-1">
        {/* 2. Far-left rail — 64px */}
        <nav className="flex w-16 shrink-0 flex-col items-center gap-1 py-2" style={{ background: C.panel, borderRight: `1px solid ${C.border}` }}>
          {RAIL.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRail(item.id)}
              className="flex w-14 flex-col items-center gap-1 rounded-lg py-1.5 transition"
              style={{
                background: rail === item.id ? `${C.purple}26` : 'transparent',
                color: rail === item.id ? C.cyan : C.muted,
                borderLeft: rail === item.id ? `2px solid ${C.purple}` : '2px solid transparent',
              }}
              title={item.label}
            >
              {item.icon}
              <span className="text-[9px] leading-none">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 3. Left media browser — 260px */}
        <aside className="flex w-[260px] shrink-0 flex-col" style={{ background: C.panel, borderRight: `1px solid ${C.border}` }}>
          <div className="border-b p-3" style={{ borderColor: C.border }}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold capitalize">{rail}</h2>
              <span className="text-[10px]" style={{ color: C.muted }}>{visibleAssets.length} items</span>
            </div>
            {(rail === 'media' || rail === 'audio') && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-semibold"
                style={{ background: `${C.purple}26`, color: C.cyan, border: `1px solid ${C.purple}` }}
              >
                <Upload className="h-3 w-3" /> Upload media
              </button>
            )}
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" hidden onChange={(e) => void handleUpload(e)} />
            <div className="flex items-center gap-2 rounded-lg px-2" style={{ background: C.stage, border: `1px solid ${C.border}` }}>
              <Search className="h-3.5 w-3.5" style={{ color: C.muted }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets"
                className="h-8 w-full bg-transparent text-[11px] outline-none"
                style={{ color: C.text }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rail === 'brand' ? (
              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ background: C.stage, border: `1px solid ${C.border}` }}>
                  <Palette className="mb-2 h-5 w-5" style={{ color: C.cyan }} />
                  <p className="text-xs font-semibold">Brand Kit</p>
                  <p className="mt-1 text-[10px]" style={{ color: C.muted }}>Colours and font are saved to this project.</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {brandColors.map((c) => (
                      <button key={c} type="button" onClick={() => applyColor(c)} className="h-6 w-6 rounded" style={{ background: c, border: color === c ? `2px solid ${C.cyan}` : `1px solid ${C.border}` }} title={`Apply ${c}`} />
                    ))}
                    <button type="button" onClick={() => setBrandColors((prev) => [...prev, color])} className="h-6 w-6 rounded text-xs" style={{ background: C.panel2, color: C.cyan, border: `1px dashed ${C.purple}` }} title="Add current colour">+</button>
                  </div>
                  <select value={brandFont} onChange={(e) => setBrandFontAndApply(e.target.value)} className="mt-3 h-8 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>
                    {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f.split(',')[0].replace(/'/g, '')}</option>)}
                  </select>
                </div>
                <button type="button" onClick={saveBrand} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px]" style={{ background: `${C.purple}26`, color: C.cyan }}>
                  <Check className="h-3.5 w-3.5" /> Save brand preset
                </button>
              </div>
            ) : rail === 'filters' ? (
              <div className="grid grid-cols-2 gap-2">
                {EFFECTS.map((fx) => (
                  <button
                    key={fx.name}
                    type="button"
                    onClick={() => applyEffect(fx.name, fx.filter)}
                    className="rounded-lg py-3 text-[10px] font-semibold"
                    style={{ background: effects.preset === fx.name ? `${C.purple}44` : C.stage, color: effects.preset === fx.name ? C.cyan : C.muted, border: `1px solid ${effects.preset === fx.name ? C.purple : C.border}` }}
                  >
                    {fx.name}
                  </button>
                ))}
              </div>
            ) : visibleAssets.length ? (
              <div className="grid grid-cols-2 gap-2">
                {visibleAssets.map((asset) => {
                  const Icon = asset.kind === 'audio' ? Music2 : asset.kind === 'video' ? Video : asset.kind === 'text' ? Type : asset.kind === 'shape' ? Shapes : asset.kind === 'transition' ? Sparkles : ImageIcon
                  return (
                    <div key={asset.id} className="group relative overflow-hidden rounded-lg" style={{ background: C.stage, border: `1px solid ${C.border}` }}>
                      <button type="button" onClick={() => void addAsset(asset)} className="block w-full text-left" title={`Add ${asset.name}`}>
                        <div className="relative flex h-16 items-center justify-center overflow-hidden" style={{ background: asset.gradient || C.stage }}>
                          {asset.thumbnail ? <img src={asset.thumbnail} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6 text-white/80" />}
                          <span className="absolute bottom-1 left-1 rounded px-1 text-[8px] font-bold text-white/80" style={{ background: '#0008' }}>{asset.label}</span>
                        </div>
                        <p className="truncate px-2 py-1.5 text-[10px]" style={{ color: C.text }}>{asset.name}</p>
                      </button>
                      {asset.kind !== 'transition' && asset.kind !== 'text' && asset.kind !== 'shape' && (
                        <button
                          type="button"
                          onClick={() => toggleFavorite(asset.id)}
                          className="absolute right-1 top-1 rounded p-1"
                          style={{ background: '#0007', color: favorites.has(asset.id) ? '#fbbf24' : '#ffffffaa' }}
                          title={favorites.has(asset.id) ? 'Remove favourite' : 'Add favourite'}
                        >
                          <Star className="h-3 w-3" fill={favorites.has(asset.id) ? 'currentColor' : 'none'} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-8 text-center text-[11px]" style={{ color: C.muted }}>
                <p>No assets found.</p>
                {(rail === 'media' || rail === 'audio') && <p className="mt-2">Upload a file above to add real media.</p>}
              </div>
            )}
          </div>
        </aside>

        {/* Centre column: preview + timeline */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 4. Preview canvas */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4" style={{ background: C.stage }}>
            <div
              ref={stageRef}
              className="relative overflow-hidden rounded-lg shadow-2xl"
              style={{
                background: project?.background || '#111318',
                aspectRatio: aspect.replace(':', ' / '),
                height: aspect === '16:9' ? 'auto' : 'calc(100% - 6rem)',
                maxHeight: 'calc(100% - 6rem)',
                width: aspect === '16:9' ? 'min(100%, 42rem)' : 'auto',
                maxWidth: '100%',
                border: `1px solid ${C.border}`,
                transform: `scale(${stageScale}) rotate(${stageRotation}deg)`,
                opacity: stageOpacity,
                filter: filterString,
              }}
            >
              {previewClip?.src && (
                previewClip.src.startsWith('data:image') ? (
                  <img src={previewClip.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <video ref={videoRef} src={previewClip.src} className="absolute inset-0 h-full w-full object-cover" muted={volume === 0} playsInline />
                )
              )}
              <DesignPreview
                design={previewDesign}
                transparent={!!previewClip}
                interactive
                selectedElementId={selectedElementId}
                onElementClick={(id) => {
                  useEditor.getState().setSelectedElementId(id)
                  const el = elements.find((e) => e.id === id)
                  setTab(el?.type === 'text' ? 'Text' : 'Video')
                }}
                className="absolute inset-0 h-full w-full"
              />
              {!previewClip && elements.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                  <Wand2 className="h-8 w-8 opacity-60" style={{ color: C.cyan }} />
                  <p className="text-sm font-semibold">Empty canvas</p>
                  <p className="px-6 text-[10px]" style={{ color: C.muted }}>Add media, a shape or a real template from the left rail.</p>
                </div>
              )}
            </div>

            {/* Transport controls */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#13151cea', border: `1px solid ${C.border}` }}>
              <IconButton label="Skip back 5s" onClick={() => useEditor.getState().setTime(Math.max(0, time - 5))}><SkipBack className="h-3.5 w-3.5" /></IconButton>
              <button
                type="button"
                onClick={() => {
                  useEditor.getState().togglePlay()
                  const v = videoRef.current
                  if (v) { if (playing) v.pause(); else void v.play().catch(() => {}) }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-black"
                style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})` }}
                title={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <IconButton label="Skip forward 5s" onClick={() => useEditor.getState().setTime(Math.min(duration, time + 5))}><SkipForward className="h-3.5 w-3.5" /></IconButton>
              <span className="mx-1 text-[10px] tabular-nums" style={{ color: C.muted }}>{fmtTime(time)} / {fmtTime(duration)}</span>
              <span className="h-4 w-px" style={{ background: C.border }} />
              <IconButton label={volume === 0 ? 'Unmute' : 'Mute'} onClick={() => useEditor.getState().setVolume(volume === 0 ? 0.8 : 0)}>
                {volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </IconButton>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => useEditor.getState().setVolume(Number(e.target.value))} className="w-16" style={{ accentColor: C.cyan }} aria-label="Volume" />
              <IconButton label="Fullscreen" onClick={toggleFullscreen}><Maximize2 className="h-3.5 w-3.5" /></IconButton>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${C.purple}33`, color: C.cyan }}>{aspect}</span>
            </div>
          </div>

          {/* 6. Bottom timeline — 240px */}
          <div className="flex h-60 shrink-0 flex-col" style={{ background: C.panel, borderTop: `1px solid ${C.border}` }}>
            <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3" style={{ borderColor: C.border }}>
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Timeline</span>
              <IconButton label="Split clip" onClick={splitSelected}><Scissors className="h-3.5 w-3.5" /></IconButton>
              <IconButton label="Delete clip" onClick={deleteSelected}><Trash2 className="h-3.5 w-3.5" /></IconButton>
              <IconButton label="Duplicate clip" onClick={duplicateSelected}><Copy className="h-3.5 w-3.5" /></IconButton>
              <IconButton label={frozen ? 'Unfreeze preview' : 'Freeze preview'} onClick={() => { setFrozen((v) => !v); setStatus(frozen ? 'Preview resumed' : 'Preview frozen') }} active={frozen}><Snowflake className="h-3.5 w-3.5" /></IconButton>
              <span className="mx-1 h-4 w-px" style={{ background: C.border }} />
              <IconButton label="Zoom out" onClick={() => useEditor.getState().setTimelineZoom(Math.max(0.5, zoom - 0.25))}><ZoomOut className="h-3.5 w-3.5" /></IconButton>
              <input type="range" min={0.5} max={3} step={0.25} value={zoom} onChange={(e) => useEditor.getState().setTimelineZoom(Number(e.target.value))} className="w-24" style={{ accentColor: C.cyan }} aria-label="Timeline zoom" />
              <IconButton label="Zoom in" onClick={() => useEditor.getState().setTimelineZoom(Math.min(3, zoom + 0.25))}><ZoomIn className="h-3.5 w-3.5" /></IconButton>
              {frozen && <span className="ml-2 rounded px-2 py-0.5 text-[9px] font-bold" style={{ background: `${C.cyan}22`, color: C.cyan }}>FROZEN</span>}
              {status && <span className="ml-auto max-w-[16rem] truncate text-[10px]" style={{ color: C.cyan }}>{status}</span>}
            </div>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {/* Track labels */}
              <div className="w-28 shrink-0" style={{ borderRight: `1px solid ${C.border}` }}>
                <div className="h-6" style={{ borderBottom: `1px solid ${C.border}` }} />
                {trackRows.map((row) => (
                  <div key={row.id} className="flex h-9 items-center gap-1 px-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: row.color }} />
                    <span className="flex-1 truncate text-[10px]" style={{ color: C.text }}>{row.label}</span>
                    <IconButton label={`${row.label} track options`} onClick={() => setStatus(`${row.label} track selected`)}><Lock className="h-3 w-3" /></IconButton>
                    <IconButton label={`Preview ${row.label} track`} onClick={() => setStatus(`${row.label} track previewed`)}><Eye className="h-3 w-3" /></IconButton>
                    <IconButton label={`Audio options for ${row.label}`} onClick={() => setStatus(`${row.label} audio options`)}><VolumeX className="h-3 w-3" /></IconButton>
                  </div>
                ))}
              </div>

              {/* Ruler + tracks */}
              <div className="relative min-w-0 flex-1 overflow-x-auto" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: `${58 * zoom}px 100%` }}>
                <div className="relative" style={{ width: Math.max(duration * pxPerSecond, 640) }}>
                  <div className="relative h-6" style={{ borderBottom: `1px solid ${C.border}` }} onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    useEditor.getState().setTime(((e.clientX - rect.left) / rect.width) * duration)
                  }}>
                    {rulerTicks.map((tick) => (
                      <span key={tick} className="absolute top-1 text-[9px] tabular-nums" style={{ left: tick * pxPerSecond, color: C.muted }}>{fmtTime(tick)}</span>
                    ))}
                  </div>
                  {trackRows.map((row) => (
                    <div key={row.id} className="relative h-9" style={{ borderBottom: `1px solid ${C.border}` }}>
                      {row.clips.length === 0 && (
                        <span className="absolute left-2 top-2 text-[9px]" style={{ color: '#ffffff24' }}>Add an asset to this track</span>
                      )}
                      {row.clips.map((clip) => (
                        <button
                          key={clip.id}
                          type="button"
                          onPointerDown={(e) => onClipPointerDown(e, clip)}
                          onPointerMove={(e) => onClipPointerMove(e, clip)}
                          onPointerUp={onClipPointerUp}
                          className="absolute top-1 flex h-7 touch-none items-center gap-1 overflow-hidden rounded px-1.5 text-left text-[9px] transition"
                          style={{
                            left: clip.start * pxPerSecond,
                            width: Math.max(28, clip.duration * pxPerSecond),
                            background: selectedClipId === clip.id ? `${C.purple}` : `${row.color}55`,
                            border: `1px solid ${selectedClipId === clip.id ? C.cyan : row.color}`,
                            color: C.text,
                          }}
                          title={`${clip.name || 'Clip'} · ${fmtTime(clip.start)} → ${fmtTime(clip.start + clip.duration)} · drag to move`}
                        >
                          {row.kind === 'audio' ? (
                            <span className="flex h-4 flex-1 items-center gap-px">
                              {Array.from({ length: 14 }, (_, i) => <i key={i} className="w-px rounded-full" style={{ height: 3 + ((i * 7) % 11), background: C.cyan, opacity: 0.7 }} />)}
                            </span>
                          ) : row.kind === 'caption' ? (
                            <span className="truncate rounded-sm px-1" style={{ background: '#0005' }}>{clip.name || 'Caption'}</span>
                          ) : (
                            <>
                              <span className="flex h-5 w-6 shrink-0 items-center justify-center rounded-sm" style={{ background: 'linear-gradient(135deg,#3b1d6e,#00e5ff)' }}><Video className="h-3 w-3" /></span>
                              <span className="truncate">{clip.name || 'Clip'}</span>
                              {clip.params?.transition ? <Sparkles className="ml-auto h-2.5 w-2.5 shrink-0" style={{ color: C.cyan }} /> : null}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                  {/* Playhead */}
                  <div className="pointer-events-none absolute bottom-0 top-0 z-10 w-px" style={{ left: `${playheadPercent}%`, background: `linear-gradient(to bottom, ${C.cyan}, ${C.purple})` }}>
                    <span className="absolute -left-1 top-0 h-2 w-2 rounded-full" style={{ background: C.cyan }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Right inspector — 280px */}
        <aside className="flex w-[280px] shrink-0 flex-col" style={{ background: C.panel, borderLeft: `1px solid ${C.border}` }}>
          <div className="grid shrink-0 grid-cols-4 border-b" style={{ borderColor: C.border }}>
            {(['Video', 'Audio', 'Text', 'Adjust'] as InspectorTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="py-2.5 text-[10px] font-semibold transition"
                style={{ color: tab === t ? C.cyan : C.muted, borderBottom: tab === t ? `2px solid ${C.purple}` : '2px solid transparent', background: tab === t ? `${C.purple}1a` : 'transparent' }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {(tab === 'Video' || tab === 'Text' || tab === 'Adjust') && (
              <Section title="Transform" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
                <p className="text-[9px]" style={{ color: C.muted }}>
                  {selectedElement ? `Editing layer: ${selectedElement.name}` : 'No layer selected — changes affect the whole preview.'}
                </p>
                <Slider label="Scale" value={selectedElement ? Number(selectedElement.params?.scale || 1) : scale} min={0.4} max={2} step={0.05} onChange={(v) => {
                  if (selectedElement) patchElementParams({ scale: v })
                  else setScale(v)
                }} />
                <Slider label="Position X" value={Math.round(selectedElement?.x ?? 120)} min={0} max={project?.canvasWidth || 1920} onChange={(v) => updateSelectedElement({ x: v })} disabled={!selectedElement} />
                <Slider label="Position Y" value={Math.round(selectedElement?.y ?? 120)} min={0} max={project?.canvasHeight || 1080} onChange={(v) => updateSelectedElement({ y: v })} disabled={!selectedElement} />
                <Slider label="Rotation" value={selectedElement ? Number(selectedElement.params?.rotation || 0) : rotation} min={-180} max={180} suffix="°" onChange={(v) => {
                  if (selectedElement) patchElementParams({ rotation: v })
                  else setRotation(v)
                }} />
              </Section>
            )}

            {tab === 'Text' && (
              <Section title="Text Content" icon={<Type className="h-3.5 w-3.5" />}>
                {selectedText ? (
                  <>
                    <textarea
                      value={selectedText.text || ''}
                      onChange={(e) => updateSelectedElement({ text: e.target.value })}
                      rows={3}
                      className="w-full resize-none rounded-lg p-2 text-[11px] outline-none"
                      style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}
                    />
                    <Slider label="Font size" value={selectedText.fontSize || 64} min={16} max={220} onChange={(v) => updateSelectedElement({ fontSize: v })} />
                    <div className="flex gap-1">
                      <IconButton label="Bold" active={Number(selectedText.fontWeight || 0) >= 700} onClick={() => updateSelectedElement({ fontWeight: Number(selectedText.fontWeight || 0) >= 700 ? 500 : 800 })}><Bold className="h-3.5 w-3.5" /></IconButton>
                      {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([align, Icon]) => (
                        <IconButton key={align} label={`Align ${align}`} active={selectedText.textAlign === align} onClick={() => updateSelectedElement({ textAlign: align })}><Icon className="h-3.5 w-3.5" /></IconButton>
                      ))}
                    </div>
                    <select value={selectedText.fontFamily || brandFont} onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })} className="h-8 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}>
                      {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f.split(',')[0].replace(/'/g, '')}</option>)}
                    </select>
                  </>
                ) : (
                  <button type="button" onClick={() => void addAsset(TEXT_PRESETS[0])} className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[11px]" style={{ background: `${C.purple}26`, color: C.cyan, border: `1px solid ${C.purple}` }}>
                    <Plus className="h-3.5 w-3.5" /> Add a text layer
                  </button>
                )}
              </Section>
            )}

            {(tab === 'Video' || tab === 'Adjust') && (
              <Section title="Effects" icon={<Wand2 className="h-3.5 w-3.5" />}>
                <div className="grid grid-cols-4 gap-1.5">
                  {EFFECTS.map((fx) => (
                    <button key={fx.name} type="button" onClick={() => applyEffect(fx.name, fx.filter)} className="rounded-md py-2 text-[8px] transition" style={{ background: effects.preset === fx.name ? `${C.purple}44` : C.stage, color: effects.preset === fx.name ? C.cyan : C.muted, border: `1px solid ${effects.preset === fx.name ? C.purple : C.border}` }} title={fx.name}>
                      <span className="mx-auto mb-1 block h-4 w-4 rounded" style={{ background:fx.filter === 'none' ? C.border : `linear-gradient(135deg, ${C.purple}, ${C.cyan})` }} />
                      {fx.name}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {tab === 'Adjust' && (
              <Section title="Colour Grading" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
                <Slider label="Brightness" value={effects.brightness ?? 1} min={0.2} max={2} step={0.05} onChange={(v) => patchEffects({ brightness: v })} />
                <Slider label="Contrast" value={effects.contrast ?? 1} min={0.2} max={2} step={0.05} onChange={(v) => patchEffects({ contrast: v })} />
                <Slider label="Saturation" value={effects.saturation ?? 1} min={0} max={2} step={0.05} onChange={(v) => patchEffects({ saturation: v })} />
                <button type="button" onClick={() => patchEffects({ brightness: 1, contrast: 1, saturation: 1, filter: 'none', preset: 'None' })} className="w-full rounded py-1.5 text-[10px]" style={{ background: C.stage, color: C.muted, border: `1px solid ${C.border}` }}>Reset grading</button>
              </Section>
            )}

            <Section title="Colours" icon={<Palette className="h-3.5 w-3.5" />}>
              <div className="h-4 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.purple}, ${C.cyan}, #22c55e, #fbbf24, #f43f5e)` }} />
              <div className="flex flex-wrap gap-1.5">
                {[C.purple, C.cyan, '#22c55e', '#fbbf24', '#f43f5e', '#ffffff'].map((c) => (
                  <button key={c} type="button" onClick={() => applyColor(c)} className="h-5 w-5 rounded-md" style={{ background: c, border: color === c ? `2px solid ${C.text}` : `1px solid ${C.border}` }} title={`Apply ${c}`} />
                ))}
              </div>
            </Section>

            {(tab === 'Video' || tab === 'Audio') && (
              <Section title="Playback" icon={<Gauge className="h-3.5 w-3.5" />}>
                <Slider label="Playback speed" value={speed} min={0.25} max={4} step={0.05} suffix="×" onChange={(v) => { setSpeed(v); useEditor.getState().setPlaybackRate(v) }} />
                <div className="flex gap-1">
                  {[0.5, 1, 1.5, 2].map((r) => (
                    <button key={r} type="button" onClick={() => { setSpeed(r); useEditor.getState().setPlaybackRate(r) }} className="flex-1 rounded py-1 text-[9px]" style={{ background: speed === r ? `${C.purple}44` : C.stage, color: speed === r ? C.cyan : C.muted, border: `1px solid ${C.border}` }}>{r}×</button>
                  ))}
                </div>
              </Section>
            )}

            {tab === 'Audio' && (
              <Section title="Audio Mix" icon={<Volume2 className="h-3.5 w-3.5" />}>
                <Slider label="Master volume" value={volume} min={0} max={1} step={0.05} onChange={(v) => useEditor.getState().setVolume(v)} />
                <Slider label="Fade in" value={Number(selectedClip?.params?.fadeIn || 0)} min={0} max={10} step={0.5} suffix="s" onChange={(v) => patchClipParams({ fadeIn: v })} disabled={!selectedClip} />
                <Slider label="Fade out" value={Number(selectedClip?.params?.fadeOut || 0)} min={0} max={10} step={0.5} suffix="s" onChange={(v) => patchClipParams({ fadeOut: v })} disabled={!selectedClip} />
                <p className="text-[9px]" style={{ color: C.muted }}>{selectedClip ? `Editing clip: ${selectedClip.name || 'Clip'}` : 'Select an audio clip on the timeline.'}</p>
              </Section>
            )}

            <Section title="Opacity" icon={<Eye className="h-3.5 w-3.5" />}>
              <Slider label="Opacity" value={selectedElement ? (selectedElement.opacity ?? 1) : opacity} min={0} max={1} step={0.05} onChange={(v) => {
                if (selectedElement) updateSelectedElement({ opacity: v })
                else setOpacity(v)
              }} />
            </Section>

            <Section title="Export Settings" icon={<Download className="h-3.5 w-3.5" />}>
              <label className="block text-[10px]" style={{ color: C.muted }}>
                Format
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="mt-1 h-7 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}>
                  {['MP4', 'WebM', 'GIF', 'Project JSON'].map((f) => <option key={f}>{f}</option>)}
                </select>
              </label>
              <label className="block text-[10px]" style={{ color: C.muted }}>
                Resolution
                <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="mt-1 h-7 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}>
                  {['720p', '1080p', '1440p', '4K'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-[10px]" style={{ color: C.muted }}>
                Frame Rate
                <select value={frameRate} onChange={(e) => setFrameRate(e.target.value)} className="mt-1 h-7 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}>
                  {['24 fps', '30 fps', '60 fps'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <Slider label="Quality" value={quality} min={60} max={100} onChange={setQuality} suffix="%" />
              <button
                type="button"
                onClick={() => void runExport()}
                disabled={exporting}
                className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold text-white transition disabled:opacity-60"
                style={{ background: `linear-gradient(90deg, ${C.cyan}, ${C.purple})` }}
              >
                <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Download / Export'}
              </button>
              {status && <p className="text-[10px]" style={{ color: C.cyan }}>{status}</p>}
            </Section>

            <div className="flex items-center gap-2 px-3 py-3 text-[10px]" style={{ color: C.muted }}>
              <Crop className="h-3.5 w-3.5" style={{ color: C.cyan }} />
              {selectedElement ? `Editing: ${selectedElement.name}` : selectedClip ? `Editing: ${selectedClip.name || 'Clip'}` : 'Select a layer or clip to edit its properties'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
