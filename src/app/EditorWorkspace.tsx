import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Undo2, Redo2, Scissors, LayoutGrid, Columns2, PanelRight, Monitor, Settings, Download,
  Search, Star, Plus, Video, Film, Music2, Type, Shapes, Palette, Sparkles, Play, Pause,
  SkipBack, SkipForward, Volume2, VolumeX, Maximize2, ChevronDown, ChevronRight,
  Lock, Eye, Trash2, Copy, Snowflake, ZoomIn, ZoomOut,
  Image as ImageIcon, Layers, Wand2, Crop, Gauge, SlidersHorizontal, Check, X,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import { navigate } from './Router'
import { useEditor } from '../store/editor'
import { useProjects } from '../store/projectsStore'
import { getAllMedia } from '../lib/projects'
import { exportVideo } from '../lib/exportVideo'
import type { AspectRatio, Clip, MediaItem, ProjectElement } from '../lib/types'
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
type AssetKind = 'image' | 'video' | 'audio' | 'template'

interface Asset {
  id: string
  name: string
  kind: AssetKind
  src?: string
  thumbnail?: string
  gradient: string
  label: string
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

const SAMPLE_ASSETS: Asset[] = [
  { id: 'a1', name: 'City Lights', kind: 'video', gradient: 'linear-gradient(135deg,#3b1d6e,#7c3aed)', label: 'VIDEO' },
  { id: 'a2', name: 'Sunset Drive', kind: 'video', gradient: 'linear-gradient(135deg,#7c2d12,#f59e0b)', label: 'VIDEO' },
  { id: 'a3', name: 'Studio Portrait', kind: 'image', gradient: 'linear-gradient(135deg,#0e7490,#00e5ff)', label: 'IMAGE' },
  { id: 'a4', name: 'Neon Nights', kind: 'image', gradient: 'linear-gradient(135deg,#4c1d95,#db2777)', label: 'IMAGE' },
  { id: 'a5', name: 'Ambient Beat', kind: 'audio', gradient: 'linear-gradient(135deg,#065f46,#22c55e)', label: 'AUDIO' },
  { id: 'a6', name: 'Opening Title', kind: 'template', gradient: 'linear-gradient(135deg,#1e3a8a,#6366f1)', label: 'TEMPLATE' },
  { id: 'a7', name: 'Lower Third', kind: 'template', gradient: 'linear-gradient(135deg,#312e81,#a371f7)', label: 'TEMPLATE' },
  { id: 'a8', name: 'Mountain Drone', kind: 'video', gradient: 'linear-gradient(135deg,#134e4a,#0ea5e9)', label: 'VIDEO' },
]

const EFFECTS = ['None', 'Vintage', 'Cinema', 'Neon', 'Glitch', 'Fade', 'Blur', 'B&W']
const ASPECTS: AspectRatio[] = ['9:16', '16:9', '1:1', '4:5']

function fmtTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
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
  label, value, min, max, step = 1, suffix = '', onChange,
}: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
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
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full"
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
  const zoom = useEditor((s) => s.timelineZoom)

  const [aspect, setAspect] = useState<AspectRatio>(project?.aspectRatio || '9:16')
  const [rail, setRail] = useState<RailPanel>('media')
  const [tab, setTab] = useState<InspectorTab>('Video')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [media, setMedia] = useState<Asset[]>(SAMPLE_ASSETS)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [color, setColor] = useState<string>(C.purple)
  const [effect, setEffect] = useState('None')
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

  useEffect(() => {
    void useProjects.getState().loadProjects()
  }, [])

  useEffect(() => {
    if (!project) return
    const ed = useEditor.getState()
    if (ed.selectedProjectId !== project.id) {
      useEditor.setState({ selectedProjectId: project.id, elements: project.elements, clips: project.clips })
    }
    setAspect(project.aspectRatio)
  }, [project])

  useEffect(() => {
    void getAllMedia().then((items: MediaItem[]) => {
      const uploads = items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: (item.type.startsWith('video') ? 'video' : item.type.startsWith('audio') ? 'audio' : 'image') as AssetKind,
        src: item.src,
        thumbnail: item.thumbnail,
        gradient: 'linear-gradient(135deg,#312e81,#0e7490)',
        label: item.type.split('/')[0].toUpperCase(),
      }))
      if (uploads.length) setMedia([...uploads, ...SAMPLE_ASSETS])
    }).catch(() => {})
  }, [])

  const duration = useMemo(() => {
    const end = clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0)
    return Math.max(30, Math.ceil(end / 5) * 5 + 5)
  }, [clips])

  const activeClip = clips.find((c) => c.id === selectedClipId)

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
      if (videoRef.current && videoRef.current.readyState > 0) videoRef.current.currentTime = next
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, frozen, duration])

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

  const ensureProject = async () => {
    const existing = useProjects.getState().current
    if (existing) return existing
    return await useProjects.getState().createProject('Studio Project', 'video', aspect)
  }

  const addAsset = async (asset: Asset) => {
    await ensureProject()
    snapshot()
    const ed = useEditor.getState()
    const trackId = asset.kind === 'audio' ? 'track-audio'
      : asset.kind === 'template' || asset.kind === 'image' ? 'track-overlay' : 'track-video'
    const start = ed.clips.filter((c) => c.trackId === trackId).reduce((max, c) => Math.max(max, c.start + c.duration), 0)
    const id = ed.addClip({ trackId, start, duration: 3, name: asset.name, src: asset.src })
    const next = [...useEditor.getState().clips]
    persistClips(next)
    setStatus(`Added “${asset.name}” to the ${trackId.replace('track-', '')} track`)
    if (asset.kind === 'template' || asset.kind === 'image') {
      const el = ed.addElement({
        type: asset.kind === 'template' ? 'text' : 'image',
        name: asset.name,
        text: asset.kind === 'template' ? asset.name : undefined,
        src: asset.src,
        x: 120, y: 120, width: 600, height: 180,
        fontSize: 52, color: C.purple, opacity: 1,
      } as Omit<Partial<ProjectElement>, 'id'>)
      const p = useProjects.getState().current
      if (p) void useProjects.getState().updateCurrent({ elements: [...useEditor.getState().elements] })
      void el
    }
    void id
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

  const visibleAssets = media.filter((a) => {
    const matchPanel =
      rail === 'media' ? ['image', 'video', 'template'].includes(a.kind)
      : rail === 'audio' ? a.kind === 'audio'
      : rail === 'text' ? a.kind === 'template'
      : rail === 'stock' ? a.kind === 'video'
      : rail === 'elements' ? a.kind === 'image' || a.kind === 'template'
      : true
    return matchPanel && a.name.toLowerCase().includes(query.toLowerCase())
  })

  const runExport = async () => {
    const p = useProjects.getState().current
    if (!p) { setStatus('Create or open a project before exporting'); return }
    setExporting(true)
    setStatus('Preparing export…')
    try {
      const blob = await exportVideo({ project: { ...p, clips: useEditor.getState().clips }, onProgress: setStatus })
      const a = document.createElement('a')
      if (blob) {
        a.href = URL.createObjectURL(blob)
        a.download = `${p.name}.${exportFormat.toLowerCase()}`
        setStatus(`${exportFormat} exported at ${resolution} / ${frameRate}`)
      } else {
        const json = new Blob([JSON.stringify({ ...p, clips: useEditor.getState().clips }, null, 2)], { type: 'application/json' })
        a.href = URL.createObjectURL(json)
        a.download = `${p.name}.pixelcraft.json`
        setStatus('Encoder unavailable — exported project JSON instead')
      }
      a.click()
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

  const rulerTicks = Array.from({ length: Math.floor(duration / 5) + 1 }, (_, i) => i * 5)
  const pxPerSecond = (58 * zoom) / 5
  const playheadPercent = Math.min(100, (time / duration) * 100)

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
          <IconButton label="Grid layout" onClick={() => setStatus('Grid layout')} active><LayoutGrid className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Column layout" onClick={() => setStatus('Column layout')}><Columns2 className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Inspector layout" onClick={() => setStatus('Inspector layout')}><PanelRight className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Preview monitor" onClick={() => setStatus('Preview monitor')}><Monitor className="h-3.5 w-3.5" /></IconButton>
          <span className="mx-1 h-5 w-px" style={{ background: C.border }} />
          {ASPECTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => { setAspect(a); void useProjects.getState().updateCurrent({ aspectRatio: a }) }}
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
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold capitalize">{rail}</h2>
              <span className="text-[10px]" style={{ color: C.muted }}>{visibleAssets.length} items</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2" style={{ background: C.stage, border: `1px solid ${C.border}` }}>
              <Search className="h-3.5 w-3.5" style={{ color: C.muted }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search media"
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
                  <p className="mt-1 text-[10px]" style={{ color: C.muted }}>Colors, fonts and logos for this workspace.</p>
                  <div className="mt-3 flex gap-1.5">
                    {[C.purple, C.cyan, '#22c55e', '#f59e0b'].map((c) => <span key={c} className="h-5 w-5 rounded" style={{ background: c }} />)}
                  </div>
                </div>
                <button type="button" onClick={() => setStatus('Brand kit saved')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px]" style={{ background: `${C.purple}26`, color: C.cyan }}>
                  <Check className="h-3.5 w-3.5" /> Save brand preset
                </button>
              </div>
            ) : visibleAssets.length ? (
              <div className="grid grid-cols-2 gap-2">
                {visibleAssets.map((asset) => (
                  <div key={asset.id} className="group relative overflow-hidden rounded-lg" style={{ background: C.stage, border: `1px solid ${C.border}` }}>
                    <button type="button" onClick={() => void addAsset(asset)} className="block w-full text-left" title={`Add ${asset.name} to timeline`}>
                      <div className="relative flex h-16 items-center justify-center" style={{ background: asset.gradient }}>
                        {asset.kind === 'audio' ? <Music2 className="h-6 w-6 text-white/80" /> : <ImageIcon className="h-6 w-6 text-white/80" />}
                        <span className="absolute bottom-1 left-1 rounded px-1 text-[8px] font-bold text-white/80" style={{ background: '#0008' }}>{asset.label}</span>
                      </div>
                      <p className="truncate px-2 py-1.5 text-[10px]" style={{ color: C.text }}>{asset.name}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(asset.id)}
                      className="absolute right-1 top-1 rounded p-1"
                      style={{ background: '#0007', color: favorites.has(asset.id) ? '#fbbf24' : '#ffffffaa' }}
                      title={favorites.has(asset.id) ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Star className="h-3 w-3" fill={favorites.has(asset.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void addAsset(asset)}
                      className="absolute bottom-7 right-1 rounded p-1 text-white"
                      style={{ background: C.purple }}
                      title="Add to timeline"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-8 text-center text-[11px]" style={{ color: C.muted }}>No assets match “{query}”.</p>
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
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                opacity,
                filter: effect === 'B&W' ? 'grayscale(1)' : effect === 'Blur' ? 'blur(2px)' : effect === 'Neon' ? 'saturate(1.8) contrast(1.2)' : 'none',
              }}
            >
              {activeClip?.src ? (
                <video ref={videoRef} src={activeClip.src} className="h-full w-full object-cover" muted={volume === 0} playsInline />
              ) : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <Wand2 className="h-8 w-8 opacity-60" style={{ color: C.cyan }} />
                <p className="px-4 text-sm font-semibold" style={{ color: C.text }}>{project?.name || 'Studio preview'}</p>
                <p className="text-[10px]" style={{ color: C.muted }}>{aspect} · {clips.length} clips on timeline</p>
              </div>
              {elements.filter((el) => !el.hidden && el.text).slice(0, 3).map((el) => (
                <div
                  key={el.id}
                  className="absolute truncate px-2 text-center font-display font-bold"
                  style={{ left: `${Math.min(90, (el.x / (project?.canvasWidth || 1080)) * 100)}%`, top: `${Math.min(90, (el.y / (project?.canvasHeight || 1920)) * 100)}%`, color: el.color || C.cyan, fontSize: Math.max(10, (el.fontSize || 48) / 6), opacity: el.opacity ?? 1 }}
                >
                  {el.text}
                </div>
              ))}
            </div>

            {/* Transport controls */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#13151cea', border: `1px solid ${C.border}` }}>
              <IconButton label="Skip back 5s" onClick={() => useEditor.getState().setTime(Math.max(0, time - 5))}><SkipBack className="h-3.5 w-3.5" /></IconButton>
              <button
                type="button"
                onClick={() => { useEditor.getState().togglePlay(); if (videoRef.current) { if (playing) videoRef.current.pause(); else void videoRef.current.play() } }}
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
                    <IconButton label={`Lock ${row.label} track`} onClick={() => setStatus(`${row.label} track lock toggled`)}><Lock className="h-3 w-3" /></IconButton>
                    <IconButton label={`Hide ${row.label} track`} onClick={() => setStatus(`${row.label} track visibility toggled`)}><Eye className="h-3 w-3" /></IconButton>
                    <IconButton label={`Mute ${row.label} track`} onClick={() => setStatus(`${row.label} track mute toggled`)}><VolumeX className="h-3 w-3" /></IconButton>
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
                        <span className="absolute left-2 top-2 text-[9px]" style={{ color: '#ffffff24' }}>Drop {row.label.toLowerCase()} here</span>
                      )}
                      {row.clips.map((clip) => (
                        <button
                          key={clip.id}
                          type="button"
                          onClick={() => useEditor.getState().setSelectedClip(clip.id)}
                          className="absolute top-1 flex h-7 items-center gap-1 overflow-hidden rounded px-1.5 text-left text-[9px] transition"
                          style={{
                            left: clip.start * pxPerSecond,
                            width: Math.max(28, clip.duration * pxPerSecond),
                            background: selectedClipId === clip.id ? `${C.purple}` : `${row.color}55`,
                            border: `1px solid ${selectedClipId === clip.id ? C.cyan : row.color}`,
                            color: C.text,
                          }}
                          title={`${clip.name || 'Clip'} · ${fmtTime(clip.start)} → ${fmtTime(clip.start + clip.duration)}`}
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
                              <Sparkles className="ml-auto h-2.5 w-2.5 shrink-0" style={{ color: C.cyan }} />
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
            <Section title="Transform" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
              <Slider label="Scale" value={scale} min={0.4} max={2} step={0.05} onChange={setScale} />
              <Slider label="Position X" value={Math.round((elements[0]?.x || 120))} min={0} max={1920} onChange={(v) => { const el = elements[0]; if (el) useEditor.getState().updateElement(el.id, { x: v }) }} />
              <Slider label="Position Y" value={Math.round((elements[0]?.y || 120))} min={0} max={1080} onChange={(v) => { const el = elements[0]; if (el) useEditor.getState().updateElement(el.id, { y: v }) }} />
              <Slider label="Rotation" value={rotation} min={-180} max={180} suffix="°" onChange={setRotation} />
            </Section>

            <Section title="Colors" icon={<Palette className="h-3.5 w-3.5" />}>
              <div className="h-4 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.purple}, ${C.cyan}, #22c55e, #fbbf24, #f43f5e)` }} />
              <div className="flex flex-wrap gap-1.5">
                {[C.purple, C.cyan, '#22c55e', '#fbbf24', '#f43f5e', '#ffffff'].map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} className="h-5 w-5 rounded-md" style={{ background: c, border: color === c ? `2px solid ${C.text}` : `1px solid ${C.border}` }} title={c} />
                ))}
              </div>
            </Section>

            <Section title="Speed" icon={<Gauge className="h-3.5 w-3.5" />}>
              <Slider label="Playback speed" value={speed} min={0.25} max={4} step={0.05} suffix="×" onChange={(v) => { setSpeed(v); useEditor.getState().setPlaybackRate(v) }} />
              <div className="flex gap-1">
                {[0.5, 1, 1.5, 2].map((r) => (
                  <button key={r} type="button" onClick={() => { setSpeed(r); useEditor.getState().setPlaybackRate(r) }} className="flex-1 rounded py-1 text-[9px]" style={{ background: speed === r ? `${C.purple}44` : C.stage, color: speed === r ? C.cyan : C.muted, border: `1px solid ${C.border}` }}>{r}×</button>
                ))}
              </div>
            </Section>

            <Section title="Effects" icon={<Wand2 className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-4 gap-1.5">
                {EFFECTS.map((name) => (
                  <button key={name} type="button" onClick={() => setEffect(name)} className="rounded-md py-2 text-[8px] transition" style={{ background: effect === name ? `${C.purple}44` : C.stage, color: effect === name ? C.cyan : C.muted, border: `1px solid ${effect === name ? C.purple : C.border}` }} title={name}>
                    {name === 'B&W' ? <span className="mx-auto mb-1 block h-4 w-4 rounded bg-gradient-to-br from-white to-black" /> : <span className="mx-auto mb-1 block h-4 w-4 rounded" style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})` }} />}
                    {name}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Opacity" icon={<Eye className="h-3.5 w-3.5" />}>
              <Slider label="Opacity" value={opacity} min={0} max={1} step={0.05} onChange={setOpacity} />
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
              <Crop className="h-3.5 w-3.5" style={{ color: C.cyan }} /> {activeClip ? `Editing: ${activeClip.name || 'Clip'}` : 'Select a clip to edit its properties'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
