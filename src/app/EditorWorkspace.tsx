import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Undo2, Redo2, Scissors, LayoutGrid, Columns2, PanelRight, Monitor, Settings, Download,
  Search, Star, Plus, Video, Film, Music2, Type, Shapes, Palette, Sparkles, Play, Pause,
  SkipBack, SkipForward, Volume2, VolumeX, Maximize2, ChevronDown, ChevronRight,
  Lock, Eye, Trash2, Copy, Snowflake, ZoomIn, ZoomOut, Upload,
  Image as ImageIcon, Layers, Wand2, Crop, Gauge, SlidersHorizontal, Check, X,
  AlignLeft, AlignCenter, AlignRight, Bold, Zap, PartyPopper, Move, Box,
  MessageSquare, PenTool, EyeOff, LockKeyhole, Clapperboard,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import DesignPreview from '../components/ui/DesignPreview'
import { navigate } from './Router'
import { useEditor } from '../store/editor'
import { useProjects, storeMediaFile } from '../store/projectsStore'
import { nextProjectName } from '../lib/projects'
import { useAuth } from '../store/authStore'
import { deleteMedia, getAllMedia } from '../lib/projects'
import { exportVideo, type ExportFormat } from '../lib/exportVideo'
import { designToDataUrl } from '../lib/previewSvg'
import { TEMPLATES } from '../data/templates'
import {
  ALL_EFFECTS, EFFECT_CATEGORIES, effectsToCss,
  type ClipEffect, type StudioEffect,
} from '../data/effects'
import type { AspectRatio, Clip, MediaItem, Project, ProjectElement, Template, Track } from '../lib/types'
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

type RailPanel = 'media' | 'templates' | 'audio' | 'text' | 'elements' | 'transitions' | 'effects' | 'brand'
type InspectorTab = 'Video' | 'Audio' | 'Text' | 'Adjust'
type AssetKind = 'image' | 'video' | 'audio' | 'template' | 'text' | 'shape' | 'transition'

interface EditorSnapshot {
  clips: Clip[]
  elements: ProjectElement[]
  tracks: Track[]
  effects: NonNullable<Project['effects']>
}

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
  { id: 'templates', label: 'Templates', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'audio', label: 'Audio', icon: <Music2 className="h-4 w-4" /> },
  { id: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
  { id: 'elements', label: 'Elements', icon: <Shapes className="h-4 w-4" /> },
  { id: 'transitions', label: 'Transitions', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'effects', label: 'Effects', icon: <Wand2 className="h-4 w-4" /> },
  { id: 'brand', label: 'Brand', icon: <Layers className="h-4 w-4" /> },
]

const CATEGORY_ICONS: Record<string, ReactNode> = {
  Zap: <Zap className="h-3.5 w-3.5" />,
  Sparkles: <Sparkles className="h-3.5 w-3.5" />,
  Film: <Film className="h-3.5 w-3.5" />,
  PartyPopper: <PartyPopper className="h-3.5 w-3.5" />,
  Move: <Move className="h-3.5 w-3.5" />,
  Box: <Box className="h-3.5 w-3.5" />,
  Scissors: <Scissors className="h-3.5 w-3.5" />,
  Clapperboard: <Clapperboard className="h-3.5 w-3.5" />,
  Wand2: <Wand2 className="h-3.5 w-3.5" />,
  Palette: <Palette className="h-3.5 w-3.5" />,
  Monitor: <Monitor className="h-3.5 w-3.5" />,
  Snowflake: <Snowflake className="h-3.5 w-3.5" />,
  MessageSquare: <MessageSquare className="h-3.5 w-3.5" />,
  Columns2: <Columns2 className="h-3.5 w-3.5" />,
  PenTool: <PenTool className="h-3.5 w-3.5" />,
}

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
const ASPECT_SIZES: Record<AspectRatio, [number, number]> = {
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
}
const FONT_OPTIONS = ["'Inter', sans-serif", "'Georgia', serif", "'Courier New', monospace", "'Arial', sans-serif"]

function fmtTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
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
  const playbackRate = useEditor((s) => s.playbackRate)
  const selectedClipId = useEditor((s) => s.selectedClipId)
  const selectedElementId = useEditor((s) => s.selectedElementId)
  const zoom = useEditor((s) => s.timelineZoom)
  const { session } = useAuth()

  const [aspect, setAspect] = useState<AspectRatio>(project?.aspectRatio || '9:16')
  const [rail, setRail] = useState<RailPanel>('effects')
  const [tab, setTab] = useState<InspectorTab>('Video')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet('pixelcraft:favourite-assets'))
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
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportName, setExportName] = useState('')
  const [exportProgress, setExportProgress] = useState(0)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [status, setStatus] = useState('')
  const [frozen, setFrozen] = useState(false)
  const [effectCategory, setEffectCategory] = useState(EFFECT_CATEGORIES[0].name)
  const [effectQuery, setEffectQuery] = useState('')
  const [favoriteEffects, setFavoriteEffects] = useState<Set<string>>(() => loadSet('pixelcraft:favourite-effects'))
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [selectedEffectId, setSelectedEffectId] = useState<string | undefined>()
  const [workspaceLayout, setWorkspaceLayout] = useState<'grid' | 'column' | 'inspector'>('grid')
  const [focusPreview, setFocusPreview] = useState(false)
  const [history, setHistory] = useState<EditorSnapshot[]>([])
  const [future, setFuture] = useState<EditorSnapshot[]>([])
  const [waveforms, setWaveforms] = useState<Record<string, number[]>>({})

  const stageRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dragRef = useRef<{
    id: string
    startX: number
    originalStart: number
    originalDuration: number
    mode: 'move' | 'trim-start' | 'trim-end'
  } | null>(null)

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

  const effects = project?.effects || {}
  const tracks = project?.tracks || []
  const hiddenTrackIds = new Set(tracks.filter((t) => t.hidden).map((t) => t.id))

  const activeSrcClips = clips.filter(
    (c) => !!c.src && !hiddenTrackIds.has(c.trackId) &&
      !c.src.startsWith('data:image/svg+xml') && time >= c.start && time < c.start + c.duration,
  )
  // Video is the background; images on the overlay track sit on top of it.
  // The old code picked only one clip, so an uploaded image over a video
  // never appeared in the preview.
  const backgroundClip =
    activeSrcClips.find((c) => c.trackId === 'track-video' && c.src?.startsWith('data:video')) ||
    activeSrcClips.find((c) => c.trackId === 'track-video') ||
    activeSrcClips.find((c) => c.trackId === 'track-overlay' && c.src?.startsWith('data:image'))
  const overlayClips = activeSrcClips.filter(
    (c) => c !== backgroundClip && c.trackId === 'track-overlay' && c.src?.startsWith('data:image'),
  )
  const activeAudioClip = activeSrcClips.find(
    (c) => c.trackId === 'track-audio' && !tracks.find((t) => t.id === c.trackId)?.muted,
  )
  const previewClip = backgroundClip
  const selectedClip = clips.find((c) => c.id === selectedClipId)
  const selectedClipEffects = (selectedClip?.params?.effects as ClipEffect[] | undefined) || []
  const selectedEffect = selectedClipEffects.find((e) => e.id === selectedEffectId)
  const selectedElement = elements.find((e) => e.id === selectedElementId)
  const selectedText = selectedElement?.type === 'text' ? selectedElement : undefined

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

  // The inspector persists through updateCurrent(), which no-ops without a
  // current project. Opening /workspace directly must therefore create or
  // open one, otherwise every right-hand control would silently do nothing.
  const ensureProject = useCallback(async (): Promise<Project> => {
    if (useProjects.getState().current) return useProjects.getState().current as Project
    if (!useProjects.getState().projects.length) await useProjects.getState().loadProjects()
    const all = useProjects.getState().projects
    if (all.length) {
      const newest = [...all].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      await useProjects.getState().openProject(newest.id)
      const opened = useProjects.getState().current
      if (opened) return opened
    }
    return await useProjects.getState().createProject(
      nextProjectName(useProjects.getState().projects),
      'video',
      '9:16',
    )
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      await useProjects.getState().loadProjects()
      if (alive) await ensureProject()
    })()
    return () => { alive = false }
  }, [ensureProject])
  useEffect(() => { void refreshMedia() }, [refreshMedia])
  useEffect(() => {
    try {
      localStorage.setItem('pixelcraft:favourite-assets', JSON.stringify([...favorites]))
      localStorage.setItem('pixelcraft:favourite-effects', JSON.stringify([...favoriteEffects]))
    } catch { /* storage disabled — favourites remain in memory */ }
  }, [favorites, favoriteEffects])
  useEffect(() => {
    if (!frozen) return
    videoRef.current?.pause()
    audioRef.current?.pause()
  }, [frozen])

  const initializedProjectId = useRef<string | null>(null)
  useEffect(() => {
    if (!project) return
    const ed = useEditor.getState()
    if (ed.selectedProjectId !== project.id) {
      useEditor.setState({ selectedProjectId: project.id, elements: project.elements, clips: project.clips })
    }
    if (initializedProjectId.current !== project.id) {
      initializedProjectId.current = project.id
      setAspect(project.aspectRatio)
      if (project.brand?.colors?.length) setBrandColors(project.brand.colors)
      if (project.brand?.font) setBrandFont(project.brand.font)
      setColor(project.brand?.colors?.[0] || C.purple)
      // Select a real layer so Position/Transform/Text controls are live.
      if (!useEditor.getState().selectedElementId && project.elements.length) {
        const first = project.elements.find((e) => e.type === 'text') || project.elements[0]
        useEditor.setState({ selectedElementId: first.id })
      }
    }
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
    v.volume = volume
    v.playbackRate = playbackRate
    const local = Math.max(0, time - previewClip.start)
    if (Math.abs(v.currentTime - local) > 0.25) v.currentTime = local
    if (playing) void v.play().catch(() => {})
    else v.pause()
  }, [time, playing, volume, playbackRate, previewClip?.id, previewClip?.start, previewClip?.src])

  // Real audio playback with fade in/out from the Audio inspector.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !activeAudioClip?.src) return
    const local = Math.max(0, time - activeAudioClip.start)
    if (Math.abs(a.currentTime - local) > 0.3) a.currentTime = local
    const fadeIn = Number(activeAudioClip.params?.fadeIn || 0)
    const fadeOut = Number(activeAudioClip.params?.fadeOut || 0)
    let gain = volume
    if (fadeIn > 0) gain *= Math.min(1, local / fadeIn)
    if (fadeOut > 0) gain *= Math.min(1, Math.max(0, (activeAudioClip.duration - local) / fadeOut))
    a.volume = Math.min(1, Math.max(0, gain))
    a.playbackRate = playbackRate
    if (playing) void a.play().catch(() => {})
    else a.pause()
  }, [time, playing, volume, playbackRate, activeAudioClip?.id, activeAudioClip?.src, activeAudioClip?.start, activeAudioClip?.duration, activeAudioClip?.params?.fadeIn, activeAudioClip?.params?.fadeOut])

  // Decode a real audio clip once and draw amplitude peaks on its timeline clip.
  useEffect(() => {
    const src = activeAudioClip?.src
    const id = activeAudioClip?.id
    if (!src || !id || waveforms[id]) return
    let alive = true
    void (async () => {
      try {
        const bytes = await fetch(src).then((r) => r.arrayBuffer())
        const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioCtor()
        const decoded = await ctx.decodeAudioData(bytes.slice(0))
        const data = decoded.getChannelData(0)
        const count = 48
        const step = Math.max(1, Math.floor(data.length / count))
        const peaks = Array.from({ length: count }, (_, i) => {
          let peak = 0
          for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 1) {
            peak = Math.max(peak, Math.abs(data[j]))
          }
          return Math.round(peak * 100) / 100
        })
        if (alive) setWaveforms((prev) => ({ ...prev, [id]: peaks }))
        void ctx.close()
      } catch { /* unsupported audio codec — the fallback waveform is shown */ }
    })()
    return () => { alive = false }
  }, [activeAudioClip?.id, activeAudioClip?.src, waveforms])

  const persistEditor = useCallback((extra: Partial<Project> = {}) => {
    const p = useProjects.getState().current
    if (!p) return
    void useProjects.getState().updateCurrent({
      elements: [...useEditor.getState().elements],
      clips: [...useEditor.getState().clips],
      ...extra,
    })
  }, [])

  const currentSnapshot = useCallback((): EditorSnapshot => {
    const p = useProjects.getState().current
    return {
      clips: useEditor.getState().clips.map((c) => ({ ...c })),
      elements: useEditor.getState().elements.map((e) => ({ ...e })),
      tracks: (p?.tracks || []).map((t) => ({ ...t })),
      effects: { ...(p?.effects || {}) },
    }
  }, [])

  const snapshot = useCallback(() => {
    setHistory((h) => [...h.slice(-29), currentSnapshot()])
    setFuture([])
  }, [currentSnapshot])

  const restoreSnapshot = useCallback((s: EditorSnapshot) => {
    useEditor.setState({
      clips: s.clips.map((c) => ({ ...c })),
      elements: s.elements.map((e) => ({ ...e })),
    })
    void useProjects.getState().updateCurrent({
      clips: s.clips,
      elements: s.elements,
      tracks: s.tracks,
      effects: s.effects,
    })
  }, [])

  const persistClips = useCallback((next: Clip[]) => {
    useEditor.setState({ clips: next })
    const p = useProjects.getState().current
    if (p) void useProjects.getState().updateCurrent({ clips: next })
  }, [])

  const undo = () => {
    if (!history.length) return
    const prev = history[history.length - 1]
    setFuture((f) => [currentSnapshot(), ...f])
    setHistory((h) => h.slice(0, -1))
    restoreSnapshot(prev)
    setStatus('Undid last edit')
  }

  const redo = () => {
    if (!future.length) return
    const next = future[0]
    setHistory((h) => [...h, currentSnapshot()])
    setFuture((f) => f.slice(1))
    restoreSnapshot(next)
    setStatus('Redid edit')
  }

  const addAsset = async (asset: Asset, placement?: { start: number; trackId: string }) => {
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
        id: v4(), trackId: placement?.trackId || 'track-overlay', start: placement?.start ?? 0, duration: 6,
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
      nextClips.push({ id: v4(), trackId: 'track-captions', start: placement?.start ?? 0, duration: 4, name: preset.text, params: {} })
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
      nextClips.push({ id: v4(), trackId: placement?.trackId || 'track-overlay', start: placement?.start ?? 0, duration: 4, name: asset.name, src: thumb, params: {} })
      message = `${asset.name} shape added and selected`
    } else {
      const trackId = placement?.trackId || (asset.kind === 'audio' ? 'track-audio' : asset.kind === 'video' ? 'track-video' : 'track-overlay')
      const start = placement?.start ?? nextClips.filter((c) => c.trackId === trackId).reduce((max, c) => Math.max(max, c.start + c.duration), 0)
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

    const addedClip = nextClips[nextClips.length - 1]
    useEditor.setState({
      elements: nextElements,
      clips: nextClips,
      selectedElementId: chooseElement,
      selectedClipId: addedClip?.id,
      // Jump the playhead to the new clip so it is visible immediately,
      // even when it was appended after another clip on the same track.
      time: addedClip?.start ?? 0,
    })
    persistEditor()
    setStatus(message)
  }

  const handleRemoveAsset = async (asset: Asset) => {
    if (!media.some((m) => m.id === asset.id)) return
    if (!window.confirm(`Remove “${asset.name}” from uploads? Clips using it will also be removed.`)) return
    setStatus(`Removing ${asset.name}…`)
    try {
      await deleteMedia(asset.id, asset.src)
      snapshot()
      const matches = (item: { mediaId?: string; src?: string }) =>
        item.mediaId === asset.id || (!!asset.src && item.src === asset.src)
      const ed = useEditor.getState()
      const nextClips = ed.clips.filter((c) => !matches(c))
      const nextElements = ed.elements.filter((e) => !matches(e))
      useEditor.setState({
        clips: nextClips,
        elements: nextElements,
        selectedClipId: nextClips.some((c) => c.id === ed.selectedClipId) ? ed.selectedClipId : undefined,
        selectedElementId: nextElements.some((e) => e.id === ed.selectedElementId) ? ed.selectedElementId : undefined,
      })
      void useProjects.getState().updateCurrent({ clips: nextClips, elements: nextElements })
      setMedia((prev) => prev.filter((m) => m.id !== asset.id))
      setStatus(`“${asset.name}” removed from uploads and timeline`)
    } catch (error) {
      setStatus(`Remove failed: ${(error as Error).message}`)
    }
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

  const toggleTrackFlag = (trackId: string, flag: 'hidden' | 'locked' | 'muted') => {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return
    const value = !track[flag]
    const next = tracks.map((t) => t.id === trackId ? { ...t, [flag]: value } : t)
    persistEditor({ tracks: next })
    setStatus(`${track.name} track ${flag === 'hidden' ? (value ? 'hidden' : 'shown') : flag === 'locked' ? (value ? 'locked' : 'unlocked') : (value ? 'muted' : 'unmuted')}`)
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

  const applyStudioEffect = (def: StudioEffect) => {
    if (!selectedClip) { setStatus('Select a video clip on the timeline first'); return }
    snapshot()
    const instance: ClipEffect = {
      id: v4(), effectId: def.id, name: def.name, category: def.category,
      intensity: def.defaultIntensity, enabled: true,
      duration: Math.min(2, selectedClip.duration),
    }
    patchClipParams({ effects: [...selectedClipEffects, instance] })
    setSelectedEffectId(instance.id)
    setTab('Video')
    setStatus(`${def.name} applied to ${selectedClip.name || 'clip'}`)
  }

  const patchSelectedEffect = (patch: Partial<ClipEffect>) => {
    if (!selectedEffect) { setStatus('Select an applied effect first'); return }
    const next = selectedClipEffects.map((e) => e.id === selectedEffect.id ? { ...e, ...patch } : e)
    patchClipParams({ effects: next })
  }

  const removeSelectedEffect = () => {
    if (!selectedEffect) return
    snapshot()
    const next = selectedClipEffects.filter((e) => e.id !== selectedEffect.id)
    patchClipParams({ effects: next })
    setSelectedEffectId(undefined)
    setStatus(`${selectedEffect.name} removed`)
  }

  const moveSelectedEffect = (direction: -1 | 1) => {
    if (!selectedEffect) return
    const index = selectedClipEffects.findIndex((e) => e.id === selectedEffect.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= selectedClipEffects.length) return
    const next = [...selectedClipEffects]
    ;[next[index], next[target]] = [next[target], next[index]]
    patchClipParams({ effects: next })
    setStatus('Effect order updated')
  }

  const toggleEffectFavorite = (id: string) => {
    setFavoriteEffects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

  const filteredEffects = useMemo(() => {
    const q = effectQuery.trim().toLowerCase()
    const pool = q
      ? ALL_EFFECTS.filter((e) => `${e.name} ${e.category} ${e.description} ${e.tags.join(' ')}`.toLowerCase().includes(q))
      : EFFECT_CATEGORIES.find((c) => c.name === effectCategory)?.effects || []
    return showFavoritesOnly ? pool.filter((e) => favoriteEffects.has(e.id)) : pool
  }, [effectQuery, effectCategory, showFavoritesOnly, favoriteEffects])

  const effectThumbStyle = (def: StudioEffect): CSSProperties => {
    const preview = effectsToCss([{
      id: 'preview', effectId: def.id, name: def.name, category: def.category,
      intensity: def.defaultIntensity, enabled: true,
    }], { t: 0.4, duration: 1 })
    return {
      background: `linear-gradient(135deg, ${def.accent}, #0b0c10 72%)`,
      filter: preview.filter === 'none' ? undefined : preview.filter,
      transform: preview.transform === 'none' ? undefined : preview.transform,
    }
  }

  const assetsByPanel = useMemo<Record<RailPanel, Asset[]>>(() => ({
    media,
    templates: templateAssets,
    audio: media.filter((a) => a.kind === 'audio'),
    text: TEXT_PRESETS,
    elements: SHAPE_PRESETS,
    transitions: TRANSITION_PRESETS,
    effects: [],
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
    setExportProgress(0)
    setStatus('Preparing export…')
    const fileBase = exportName.trim() || p.name
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
          onProgress: (msg, progress) => {
            setStatus(msg)
            if (typeof progress === 'number') setExportProgress(progress)
          },
        })
      if (!blob) {
        const json = new Blob([JSON.stringify(finalProject, null, 2)], { type: 'application/json' })
        triggerDownload(json, `${fileBase}.pixelcraft.json`)
        setStatus('No decodable media — exported project JSON instead')
      } else {
        triggerDownload(blob, `${fileBase}.${isJson ? 'pixelcraft.json' : format.toLowerCase()}`)
        setStatus(isJson ? 'Project JSON exported' : `${format} exported at ${resolution} / ${frameRate}`)
      }
      setExportProgress(100)
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

  const beginClipDrag = (e: React.PointerEvent<HTMLElement>, clip: Clip, mode: 'move' | 'trim-start' | 'trim-end') => {
    if (tracks.find((t) => t.id === clip.trackId)?.locked) {
      setStatus('Track is locked — unlock it to edit clips')
      return
    }
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      id: clip.id, startX: e.clientX, originalStart: clip.start,
      originalDuration: clip.duration, mode,
    }
    useEditor.getState().setSelectedClip(clip.id)
    setSelectedEffectId(undefined)
  }

  const onClipPointerDown = (e: React.PointerEvent<HTMLElement>, clip: Clip) =>
    beginClipDrag(e, clip, 'move')

  const onClipPointerMove = (e: React.PointerEvent<HTMLElement>, clip: Clip) => {
    const drag = dragRef.current
    if (!drag || drag.id !== clip.id) return
    const snap = (v: number) => Math.max(0, Math.round(v * 4) / 4)
    const delta = (e.clientX - drag.startX) / pxPerSecond
    let patch: Partial<Clip> = {}
    if (drag.mode === 'trim-start') {
      const start = Math.min(drag.originalStart + drag.originalDuration - 0.5, Math.max(0, snap(drag.originalStart + delta)))
      patch = { start, duration: Math.max(0.5, drag.originalDuration - (start - drag.originalStart)) }
    } else if (drag.mode === 'trim-end') {
      patch = { duration: Math.max(0.5, snap(drag.originalDuration + delta)) }
    } else {
      patch = { start: snap(drag.originalStart + delta) }
    }
    const next = useEditor.getState().clips.map((c) => c.id === clip.id ? { ...c, ...patch } : c)
    useEditor.setState({ clips: next })
  }

  const onClipPointerUp = () => {
    if (!dragRef.current) return
    const mode = dragRef.current.mode
    dragRef.current = null
    persistEditor()
    setStatus(mode === 'move' ? 'Clip position updated' : 'Clip trimmed')
  }

  const handleTimelineDrop = (e: React.DragEvent<HTMLDivElement>, trackId: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('application/x-pixelcraft-asset')
    if (!id) return
    const asset = media.find((a) => a.id === id) || templateAssets.find((a) => a.id === id) ||
      TEXT_PRESETS.find((a) => a.id === id) || SHAPE_PRESETS.find((a) => a.id === id)
    if (!asset) return
    const rect = e.currentTarget.getBoundingClientRect()
    const start = Math.max(0, Math.round(((e.clientX - rect.left) / pxPerSecond) * 4) / 4)
    void addAsset(asset, { start, trackId })
  }

  const rulerTicks = Array.from({ length: Math.floor(duration / 5) + 1 }, (_, i) => i * 5)
  const stageScale = selectedElement ? 1 : scale * previewZoom
  const stageRotation = selectedElement ? 0 : rotation
  const stageOpacity = selectedElement ? 1 : opacity
  const previewDesign = {
    aspectRatio: aspect,
    background: project?.background || '#111318',
    elements,
  }

  const renderClipMedia = (clip: Clip, className: string) => {
    const localTime = Math.max(0, time - clip.start)
    const fx = effectsToCss(clip.params?.effects as ClipEffect[] | undefined, {
      t: localTime,
      duration: clip.duration,
    })
    const fadeIn = Number(clip.params?.fadeIn || 0)
    const fadeOut = Number(clip.params?.fadeOut || 0)
    let clipOpacity = Number(clip.params?.opacity ?? 1)
    if (fadeIn > 0) clipOpacity *= Math.min(1, localTime / fadeIn)
    if (fadeOut > 0) clipOpacity *= Math.min(1, Math.max(0, (clip.duration - localTime) / fadeOut))
    const style: CSSProperties = {
      filter: fx.filter === 'none' ? undefined : fx.filter,
      transform: fx.transform === 'none' ? undefined : fx.transform,
      opacity: Math.max(0, Math.min(1, clipOpacity)),
    }
    return clip.src?.startsWith('data:video') ? (
      <video
        ref={clip === backgroundClip ? videoRef : undefined}
        src={clip.src}
        className={className}
        style={style}
        muted={volume === 0}
        playsInline
      />
    ) : (
      <img src={clip.src} alt="" className={className} style={style} />
    )
  }

  const leftPanelWidth = focusPreview ? 0 : workspaceLayout === 'column' ? 220 : workspaceLayout === 'inspector' ? 200 : 260
  const rightPanelWidth = focusPreview ? 0 : workspaceLayout === 'column' ? 240 : workspaceLayout === 'inspector' ? 340 : 280

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
          <span className="mx-1 h-5 w-px" style={{ background: C.border }} />
          <IconButton
            label="Save project"
            onClick={() => void useProjects.getState().saveCurrent().then(() => setStatus('Project saved'))}
          ><Check className="h-3.5 w-3.5" /></IconButton>
          <IconButton
            label="Save as a copy"
            onClick={() => void useProjects.getState().duplicateProject().then(() => setStatus('Project saved as a new copy'))}
          ><Copy className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Split / Cut at playhead" onClick={splitSelected}><Scissors className="h-3.5 w-3.5" /></IconButton>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            label="Grid layout"
            active={workspaceLayout === 'grid' && !focusPreview}
            onClick={() => { setWorkspaceLayout('grid'); setFocusPreview(false); setStatus('Grid layout active') }}
          ><LayoutGrid className="h-3.5 w-3.5" /></IconButton>
          <IconButton
            label="Column layout"
            active={workspaceLayout === 'column' && !focusPreview}
            onClick={() => { setWorkspaceLayout('column'); setFocusPreview(false); setStatus('Column layout active') }}
          ><Columns2 className="h-3.5 w-3.5" /></IconButton>
          <IconButton
            label="Inspector layout"
            active={workspaceLayout === 'inspector' && !focusPreview}
            onClick={() => { setWorkspaceLayout('inspector'); setFocusPreview(false); setStatus('Inspector layout active') }}
          ><PanelRight className="h-3.5 w-3.5" /></IconButton>
          <IconButton
            label={focusPreview ? 'Exit preview monitor' : 'Preview monitor focus'}
            active={focusPreview}
            onClick={() => { setFocusPreview((v) => !v); setStatus(focusPreview ? 'Workspace restored' : 'Preview monitor focus') }}
          ><Monitor className="h-3.5 w-3.5" /></IconButton>
          <span className="mx-1 h-5 w-px" style={{ background: C.border }} />
          {ASPECTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                const [canvasWidth, canvasHeight] = ASPECT_SIZES[a]
                setAspect(a)
                void useProjects.getState().updateCurrent({ aspectRatio: a, canvasWidth, canvasHeight })
                setStatus(`Canvas set to ${a} (${canvasWidth}×${canvasHeight})`)
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
            onClick={() => {
              setExportName((prev) => prev || useProjects.getState().current?.name || 'PixelCraft video')
              setExportProgress(0)
              setExportDialogOpen(true)
            }}
            className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold text-white transition"
            style={{ background: `linear-gradient(135deg, ${C.purple}, #9333ea)` }}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <IconButton label="Close studio" onClick={() => navigate('/')}><X className="h-3.5 w-3.5" /></IconButton>
        </div>
      </header>

      {/* Main workspace row */}
      <div className="flex min-h-0 flex-1">
        {/* 2. Far-left rail — 64px */}
        <nav className="flex w-16 shrink-0 flex-col items-center gap-1 py-2" style={{ background: C.panel, borderRight: `1px solid ${C.border}`, display: focusPreview ? 'none' : undefined }}>
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
        <aside className="flex shrink-0 flex-col" style={{ width: leftPanelWidth, display: focusPreview ? 'none' : undefined, background: C.panel, borderRight: `1px solid ${C.border}` }}>
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
            ) : rail === 'effects' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-lg px-2" style={{ background: C.stage, border: `1px solid ${C.border}` }}>
                    <Search className="h-3.5 w-3.5" style={{ color: C.muted }} />
                    <input
                      value={effectQuery}
                      onChange={(e) => setEffectQuery(e.target.value)}
                      placeholder="Search effects"
                      className="h-7 w-full bg-transparent text-[10px] outline-none"
                      style={{ color: C.text }}
                    />
                  </div>
                  <IconButton
                    label="Show favourite effects only"
                    active={showFavoritesOnly}
                    onClick={() => setShowFavoritesOnly((v) => !v)}
                  ><Star className="h-3 w-3" fill={showFavoritesOnly ? 'currentColor' : 'none'} /></IconButton>
                </div>
                {!effectQuery && (
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Magic Cutout</p>
                    <div className="max-h-40 space-y-0.5 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                      {EFFECT_CATEGORIES.map((category) => (
                        <button
                          key={category.name}
                          type="button"
                          onClick={() => setEffectCategory(category.name)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10px] transition"
                          style={{
                            background: effectCategory === category.name ? `${C.purple}33` : 'transparent',
                            color: effectCategory === category.name ? C.cyan : C.muted,
                            borderLeft: effectCategory === category.name ? `2px solid ${C.purple}` : '2px solid transparent',
                          }}
                        >
                          {CATEGORY_ICONS[category.icon] || <Sparkles className="h-3.5 w-3.5" />}
                          <span className="flex-1">{category.name}</span>
                          <span className="text-[8px] opacity-70">{category.effects.length}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                    {effectQuery ? `Results for “${effectQuery}”` : effectCategory}
                  </p>
                  {filteredEffects.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredEffects.map((def) => (
                        <div key={def.id} className="group relative overflow-hidden rounded-lg" style={{ background: C.stage, border: `1px solid ${C.border}` }}>
                          <button
                            type="button"
                            onClick={() => applyStudioEffect(def)}
                            className="block w-full text-left transition hover:border-[var(--color-accent-2)]"
                            title={`Apply ${def.name} to selected clip`}
                          >
                            <div className="relative h-14 overflow-hidden">
                              <div className="h-full w-full" style={effectThumbStyle(def)} />
                              <span className="absolute bottom-1 left-1 rounded px-1 text-[8px] font-bold text-white/85" style={{ background: '#0009' }}>{def.category.slice(0, 10)}</span>
                            </div>
                            <p className="truncate px-1.5 py-1 text-[9px]" style={{ color: C.text }}>{def.name}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleEffectFavorite(def.id)}
                            className="absolute right-1 top-1 rounded p-1"
                            style={{ background: '#0008', color: favoriteEffects.has(def.id) ? '#fbbf24' : '#ffffffaa' }}
                            title={favoriteEffects.has(def.id) ? 'Remove favourite effect' : 'Add favourite effect'}
                          >
                            <Star className="h-2.5 w-2.5" fill={favoriteEffects.has(def.id) ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-[10px]" style={{ color: C.muted }}>
                      {showFavoritesOnly ? 'No favourite effects yet.' : 'No matching effects.'}
                    </p>
                  )}
                </div>
                <p className="text-[9px] leading-snug" style={{ color: C.muted }}>
                  Select a clip on the timeline first, then click an effect to apply it.
                </p>
              </div>
            ) : visibleAssets.length ? (
              <div className="grid grid-cols-2 gap-2">
                {visibleAssets.map((asset) => {
                  const Icon = asset.kind === 'audio' ? Music2 : asset.kind === 'video' ? Video : asset.kind === 'text' ? Type : asset.kind === 'shape' ? Shapes : asset.kind === 'transition' ? Sparkles : ImageIcon
                  const isUpload = media.some((m) => m.id === asset.id)
                  return (
                    <div
                      key={asset.id}
                      className="group relative overflow-hidden rounded-lg"
                      style={{ background: C.stage, border: `1px solid ${C.border}` }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-pixelcraft-asset', asset.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      title={`Click to add ${asset.name}, or drag it onto a timeline track`}
                    >
                      <button type="button" onClick={() => void addAsset(asset)} className="block w-full text-left" title={`Add ${asset.name}`}>
                        <div className="relative flex h-16 items-center justify-center overflow-hidden" style={{ background: asset.gradient || C.stage }}>
                          {asset.thumbnail ? <img src={asset.thumbnail} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6 text-white/80" />}
                          <span className="absolute bottom-1 left-1 rounded px-1 text-[8px] font-bold text-white/80" style={{ background: '#0008' }}>{asset.label}</span>
                        </div>
                        <p className="truncate px-2 py-1.5 text-[10px]" style={{ color: C.text }}>{asset.name}</p>
                      </button>
                      {isUpload && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleRemoveAsset(asset) }}
                          className="absolute left-1 top-1 rounded p-1"
                          style={{ background: '#0009', color: '#ff8a8a' }}
                          title={`Remove ${asset.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
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
                <p>{rail === 'templates' ? 'No templates found.' : 'No assets found.'}</p>
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
              {backgroundClip?.src && renderClipMedia(backgroundClip, 'absolute inset-0 h-full w-full object-cover')}
              {overlayClips.map((clip) => (
                <div key={clip.id} className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                  {renderClipMedia(clip, 'max-h-full max-w-full object-contain')}
                </div>
              ))}
              {activeAudioClip?.src && <audio ref={audioRef} src={activeAudioClip.src} preload="auto" />}
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
              <input
                type="range"
                min={0} max={duration} step={0.1} value={Math.min(time, duration)}
                onChange={(e) => useEditor.getState().setTime(Number(e.target.value))}
                className="w-28"
                style={{ accentColor: C.cyan }}
                aria-label="Seek preview"
                title="Seek"
              />
              <span className="h-4 w-px" style={{ background: C.border }} />
              <button
                type="button"
                title="Playback speed"
                onClick={() => {
                  const rates = [0.5, 1, 1.5, 2]
                  const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length] || 1
                  setSpeed(next)
                  useEditor.getState().setPlaybackRate(next)
                }}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: `${C.purple}33`, color: C.cyan }}
              >{playbackRate}×</button>
              <IconButton label={volume === 0 ? 'Unmute' : 'Mute'} onClick={() => useEditor.getState().setVolume(volume === 0 ? 0.8 : 0)}>
                {volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </IconButton>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => useEditor.getState().setVolume(Number(e.target.value))} className="w-16" style={{ accentColor: C.cyan }} aria-label="Volume" />
              <span className="h-4 w-px" style={{ background: C.border }} />
              <IconButton label="Zoom preview out" onClick={() => setPreviewZoom((v) => Math.max(0.4, Number((v - 0.1).toFixed(2))))}><ZoomOut className="h-3.5 w-3.5" /></IconButton>
              <button type="button" onClick={() => setPreviewZoom(1)} className="rounded px-1 text-[9px]" style={{ color: previewZoom === 1 ? C.cyan : C.muted }} title="Fit preview">Fit</button>
              <IconButton label="Zoom preview in" onClick={() => setPreviewZoom((v) => Math.min(2.5, Number((v + 0.1).toFixed(2))))}><ZoomIn className="h-3.5 w-3.5" /></IconButton>
              <IconButton label="Fullscreen" onClick={toggleFullscreen}><Maximize2 className="h-3.5 w-3.5" /></IconButton>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${C.purple}33`, color: C.cyan }}>{Math.round(previewZoom * 100)}% · {aspect}</span>
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
                    <IconButton
                      label={`${tracks.find((t) => t.id === row.id)?.locked ? 'Unlock' : 'Lock'} ${row.label} track`}
                      active={!!tracks.find((t) => t.id === row.id)?.locked}
                      onClick={() => toggleTrackFlag(row.id, 'locked')}
                    >
                      {tracks.find((t) => t.id === row.id)?.locked ? <LockKeyhole className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    </IconButton>
                    <IconButton
                      label={`${tracks.find((t) => t.id === row.id)?.hidden ? 'Show' : 'Hide'} ${row.label} track`}
                      active={!!tracks.find((t) => t.id === row.id)?.hidden}
                      onClick={() => toggleTrackFlag(row.id, 'hidden')}
                    >
                      {tracks.find((t) => t.id === row.id)?.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </IconButton>
                    <IconButton
                      label={`${tracks.find((t) => t.id === row.id)?.muted ? 'Unmute' : 'Mute'} ${row.label} track`}
                      active={!!tracks.find((t) => t.id === row.id)?.muted}
                      onClick={() => toggleTrackFlag(row.id, 'muted')}
                    >
                      <VolumeX className="h-3 w-3" />
                    </IconButton>
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
                    <div
                      key={row.id}
                      className="relative h-9"
                      style={{ borderBottom: `1px solid ${C.border}` }}
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes('application/x-pixelcraft-asset')) {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'copy'
                        }
                      }}
                      onDrop={(e) => handleTimelineDrop(e, row.id)}
                    >
                      {row.clips.length === 0 && (
                        <span className="absolute left-2 top-2 text-[9px]" style={{ color: '#ffffff24' }}>Add an asset to this track</span>
                      )}
                      {row.clips.map((clip) => (
                        <div
                          key={clip.id}
                          role="button"
                          tabIndex={0}
                          onPointerDown={(e) => onClipPointerDown(e, clip)}
                          onPointerMove={(e) => onClipPointerMove(e, clip)}
                          onPointerUp={onClipPointerUp}
                          onKeyDown={() => useEditor.getState().setSelectedClip(clip.id)}
                          className="absolute top-1 flex h-7 touch-none items-center gap-1 overflow-hidden rounded px-2 text-left text-[9px] transition"
                          style={{
                            left: clip.start * pxPerSecond,
                            width: Math.max(36, clip.duration * pxPerSecond),
                            background: selectedClipId === clip.id ? `${C.purple}` : `${row.color}55`,
                            border: `1px solid ${selectedClipId === clip.id ? C.cyan : row.color}`,
                            color: C.text,
                            opacity: tracks.find((t) => t.id === clip.trackId)?.hidden ? 0.35 : 1,
                          }}
                          title={`${clip.name || 'Clip'} · ${fmtTime(clip.start)} → ${fmtTime(clip.start + clip.duration)} · drag to move, drag edges to trim`}
                        >
                          <span
                            onPointerDown={(e) => beginClipDrag(e, clip, 'trim-start')}
                            onPointerMove={(e) => onClipPointerMove(e, clip)}
                            onPointerUp={onClipPointerUp}
                            className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize"
                            style={{ background: '#ffffff55' }}
                            title="Trim start"
                          />
                          {row.kind === 'audio' ? (
                            <span className="flex h-4 flex-1 items-center gap-px overflow-hidden">
                              {(waveforms[clip.id] || Array.from({ length: 14 }, (_, i) => 0.25 + ((i * 7) % 11) / 14)).map((peak, i) => (
                                <i key={i} className="w-px shrink-0 rounded-full" style={{ height: 2 + peak * 14, background: C.cyan, opacity: 0.8 }} />
                              ))}
                            </span>
                          ) : row.kind === 'caption' ? (
                            <span className="truncate rounded-sm px-1" style={{ background: '#0005' }}>{clip.name || 'Caption'}</span>
                          ) : (
                            <>
                              <span className="flex h-5 w-6 shrink-0 items-center justify-center rounded-sm" style={{ background: 'linear-gradient(135deg,#3b1d6e,#00e5ff)' }}><Video className="h-3 w-3" /></span>
                              <span className="truncate">{clip.name || 'Clip'}</span>
                              {clip.params?.transition ? <Sparkles className="ml-auto h-2.5 w-2.5 shrink-0" style={{ color: C.cyan }} /> : null}
                              {((clip.params?.effects as ClipEffect[] | undefined) || []).length > 0 && <Wand2 className="ml-1 h-2.5 w-2.5 shrink-0" style={{ color: C.cyan }} />}
                            </>
                          )}
                          <span
                            onPointerDown={(e) => beginClipDrag(e, clip, 'trim-end')}
                            onPointerMove={(e) => onClipPointerMove(e, clip)}
                            onPointerUp={onClipPointerUp}
                            className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize"
                            style={{ background: '#ffffff55' }}
                            title="Trim end"
                          />
                        </div>
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
        <aside className="flex shrink-0 flex-col" style={{ width: rightPanelWidth, display: focusPreview ? 'none' : undefined, background: C.panel, borderLeft: `1px solid ${C.border}` }}>
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
              <Section title="Applied Effects" icon={<Wand2 className="h-3.5 w-3.5" />}>
                <p className="text-[9px]" style={{ color: C.muted }}>
                  {selectedClip ? `Clip: ${selectedClip.name || 'Clip'}` : 'Select a clip on the timeline first.'}
                </p>
                {selectedClipEffects.length ? (
                  <div className="space-y-1">
                    {selectedClipEffects.map((applied, index) => (
                      <div
                        key={applied.id}
                        className="flex items-center gap-1 rounded-md px-1.5 py-1"
                        style={{
                          background: selectedEffectId === applied.id ? `${C.purple}33` : C.stage,
                          border: `1px solid ${selectedEffectId === applied.id ? C.purple : C.border}`,
                          opacity: applied.enabled ? 1 : 0.45,
                        }}
                      >
                        <span className="w-3 text-[8px]" style={{ color: C.muted }}>{index + 1}</span>
                        <button type="button" onClick={() => setSelectedEffectId(applied.id)} className="flex-1 truncate text-left text-[10px]" style={{ color: C.text }}>
                          {applied.name}
                        </button>
                        <IconButton
                          label={applied.enabled ? `Disable ${applied.name}` : `Enable ${applied.name}`}
                          active={applied.enabled}
                          onClick={() => patchClipParams({ effects: selectedClipEffects.map((e) => e.id === applied.id ? { ...e, enabled: !e.enabled } : e) })}
                        >
                          <Eye className="h-3 w-3" />
                        </IconButton>
                        <IconButton
                          label={`Remove ${applied.name}`}
                          onClick={() => {
                            patchClipParams({ effects: selectedClipEffects.filter((e) => e.id !== applied.id) })
                            if (selectedEffectId === applied.id) setSelectedEffectId(undefined)
                          }}
                        ><Trash2 className="h-3 w-3" /></IconButton>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md px-2 py-3 text-center text-[9px]" style={{ background: C.stage, color: C.muted }}>No effects on this clip.</p>
                )}

                {selectedEffect && (
                  <div className="space-y-2 rounded-lg p-2" style={{ background: C.stage, border: `1px solid ${C.purple}` }}>
                    <div className="flex items-center justify-between">
                      <p className="truncate text-[10px] font-semibold" style={{ color: C.cyan }}>{selectedEffect.name}</p>
                      <span className="text-[8px]" style={{ color: C.muted }}>{selectedEffect.category}</span>
                    </div>
                    <Slider
                      label="Intensity"
                      value={selectedEffect.intensity}
                      min={0} max={1} step={0.05}
                      onChange={(v) => patchSelectedEffect({ intensity: v })}
                    />
                    <Slider
                      label="Duration"
                      value={selectedEffect.duration ?? Math.min(2, selectedClip?.duration || 2)}
                      min={0.1} max={Math.max(0.5, selectedClip?.duration || 2)} step={0.1} suffix="s"
                      onChange={(v) => patchSelectedEffect({ duration: v })}
                    />
                    <div className="flex gap-1">
                      <IconButton label="Move effect up" onClick={() => moveSelectedEffect(-1)}><ChevronDown className="h-3 w-3 rotate-180" /></IconButton>
                      <IconButton label="Move effect down" onClick={() => moveSelectedEffect(1)}><ChevronDown className="h-3 w-3" /></IconButton>
                      <button
                        type="button"
                        onClick={() => patchSelectedEffect({ intensity: ALL_EFFECTS.find((e) => e.id === selectedEffect.effectId)?.defaultIntensity ?? 0.6, enabled: true })}
                        className="flex-1 rounded py-1 text-[9px]"
                        style={{ background: C.panel2, color: C.muted, border: `1px solid ${C.border}` }}
                      >Reset</button>
                      <button type="button" onClick={removeSelectedEffect} className="flex-1 rounded py-1 text-[9px]" style={{ background: '#ef444433', color: '#fca5a5' }}>Remove</button>
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <p className="mb-1 text-[8px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Global look</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EFFECTS.map((fx) => (
                      <button key={fx.name} type="button" onClick={() => applyEffect(fx.name, fx.filter)} className="rounded-md py-2 text-[8px] transition" style={{ background: effects.preset === fx.name ? `${C.purple}44` : C.stage, color: effects.preset === fx.name ? C.cyan : C.muted, border: `1px solid ${effects.preset === fx.name ? C.purple : C.border}` }} title={fx.name}>
                        <span className="mx-auto mb-1 block h-4 w-4 rounded" style={{ background: fx.filter === 'none' ? C.border : `linear-gradient(135deg, ${C.purple}, ${C.cyan})` }} />
                        {fx.name}
                      </button>
                    ))}
                  </div>
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

            {tab === 'Video' && (
              <Section title="Clip Controls" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
                <Slider label="Clip opacity" value={Number(selectedClip?.params?.opacity ?? 1)} min={0} max={1} step={0.05} onChange={(v) => patchClipParams({ opacity: v })} disabled={!selectedClip} />
                <Slider label="Fade in" value={Number(selectedClip?.params?.fadeIn || 0)} min={0} max={10} step={0.1} suffix="s" onChange={(v) => patchClipParams({ fadeIn: v })} disabled={!selectedClip} />
                <Slider label="Fade out" value={Number(selectedClip?.params?.fadeOut || 0)} min={0} max={10} step={0.1} suffix="s" onChange={(v) => patchClipParams({ fadeOut: v })} disabled={!selectedClip} />
                <Slider label="Clip speed" value={Number(selectedClip?.params?.rate || 1)} min={0.25} max={4} step={0.05} suffix="×" onChange={(v) => patchClipParams({ rate: v })} disabled={!selectedClip || selectedClip?.trackId !== 'track-video'} />
                <div className="grid grid-cols-4 gap-1">
                  {([['cropTop', 'Top'], ['cropRight', 'Right'], ['cropBottom', 'Bottom'], ['cropLeft', 'Left']] as const).map(([key, label]) => (
                    <label key={key} className="text-[8px]" style={{ color: C.muted }}>
                      {label}
                      <input
                        type="number"
                        min={0} max={45}
                        value={Number(selectedClip?.params?.[key] || 0)}
                        onChange={(e) => patchClipParams({ [key]: Math.max(0, Math.min(45, Number(e.target.value))) })}
                        className="mt-0.5 h-6 w-full rounded px-1 text-[9px] outline-none"
                        style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}
                        aria-label={`Crop ${label}`}
                      />
                    </label>
                  ))}
                </div>
                {selectedClip?.trackId === 'track-audio' && (
                  <>
                    <Slider label="Clip volume" value={Number(selectedClip.params?.volume ?? 1)} min={0} max={1} step={0.05} onChange={(v) => patchClipParams({ volume: v })} />
                    <button
                      type="button"
                      onClick={() => patchClipParams({ muted: !selectedClip.params?.muted })}
                      className="w-full rounded py-1.5 text-[10px]"
                      style={{ background: selectedClip.params?.muted ? '#ef444433' : C.stage, color: selectedClip.params?.muted ? '#fca5a5' : C.text, border: `1px solid ${C.border}` }}
                    >{selectedClip.params?.muted ? 'Unmute clip' : 'Mute clip'}</button>
                  </>
                )}
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
                onClick={() => {
                  setExportName((prev) => prev || useProjects.getState().current?.name || 'PixelCraft video')
                  setExportProgress(0)
                  setExportDialogOpen(true)
                }}
                className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold text-white transition"
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

      {/* Export dialog — every setting here drives the real encoder */}
      {exportDialogOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#000a' }}>
          <div className="w-full max-w-md rounded-xl p-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold">Export video</p>
              <IconButton label="Close export dialog" onClick={() => { if (!exporting) setExportDialogOpen(false) }}><X className="h-3.5 w-3.5" /></IconButton>
            </div>
            <label className="mb-3 block text-[10px]" style={{ color: C.muted }}>
              File name
              <input
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                placeholder="My video"
                className="mt-1 h-8 w-full rounded px-2 text-[11px] outline-none"
                style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[10px]" style={{ color: C.muted }}>
                Format
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="mt-1 h-8 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}>
                  {['MP4', 'WebM', 'GIF', 'Project JSON'].map((f) => <option key={f}>{f}</option>)}
                </select>
              </label>
              <label className="block text-[10px]" style={{ color: C.muted }}>
                Resolution
                <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="mt-1 h-8 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}>
                  {['720p', '1080p', '1440p', '4K'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-[10px]" style={{ color: C.muted }}>
                Frame rate
                <select value={frameRate} onChange={(e) => setFrameRate(e.target.value)} className="mt-1 h-8 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }}>
                  {['24 fps', '30 fps', '60 fps'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-[10px]" style={{ color: C.muted }}>
                Quality
                <input type="number" min={60} max={100} value={quality} onChange={(e) => setQuality(Math.max(60, Math.min(100, Number(e.target.value))))} className="mt-1 h-8 w-full rounded px-2 text-[11px] outline-none" style={{ background: C.stage, color: C.text, border: `1px solid ${C.border}` }} />
              </label>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[10px]" style={{ color: C.muted }}>
                <span>{status || 'Ready to export'}</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: C.stage }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${exportProgress}%`, background: `linear-gradient(90deg, ${C.cyan}, ${C.purple})` }} />
              </div>
            </div>
            <p className="mt-2 text-[9px] leading-snug" style={{ color: C.muted }}>
              FFmpeg.wasm renders real media and export-safe effects. Time-based effects and text overlays stay in the live preview only. FFmpeg cannot be safely cancelled once encoding starts.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { if (!exporting) setExportDialogOpen(false) }}
                disabled={exporting}
                className="flex-1 rounded-lg py-2 text-[11px] font-semibold disabled:opacity-40"
                style={{ background: C.stage, color: C.muted, border: `1px solid ${C.border}` }}
              >Cancel</button>
              <button
                type="button"
                onClick={() => void runExport()}
                disabled={exporting}
                className="flex-1 rounded-lg py-2 text-[11px] font-bold text-white disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${C.purple}, #9333ea)` }}
              >{exporting ? 'Exporting…' : 'Export & download'}</button>
            </div>
          </div>
        </div>
      )}
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
