/**
 * PixelCraft Tools — real versions of the CapCut-style tools shown in the
 * app's reference screenshots. Every tool produces a real downloadable file
 * that can also be saved into the user's media library.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft, Scissors, RefreshCw, Wand2, Eraser, Image as ImageIcon,
  Combine, Maximize2, Smile, Mic, Volume2, Captions, Sparkles, LayoutTemplate,
  Download, Save, Loader2, Check, Play, Square, Film, Palette, Layers,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { navigate, useLocation } from './Router'
import { useProjects, storeMediaFile } from '../store/projectsStore'
import { useSettings, saveSettings } from '../store/settings'
import { v4 } from '../store/ids'
import type { ProjectElement } from '../lib/types'
import {
  combineImages, convertVideo, downloadBlob, enhanceImage, enhanceVideo,
  makeMeme, removeSolidBackground, resizeImage,
  textToCaptions, trimVideo, type VideoFormat,
} from '../lib/mediaTools'

type Kind = 'video' | 'image' | 'audio' | 'ai' | 'solutions'
type ResultKind = 'image' | 'video'

interface ToolResult { blob: Blob; name: string; url: string; kind: ResultKind }

function useTool() {
  const [result, setResult] = useState<ToolResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url) }, [result])

  const run = async (fn: () => Promise<Blob>, name: string, kind: ResultKind) => {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const blob = await fn()
      setResult({ blob, name, url: URL.createObjectURL(blob), kind })
    } catch (e) {
      setResult(null)
      setError((e as Error)?.message || 'Operation failed')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!result) return
    await storeMediaFile(new File([result.blob], result.name, { type: result.blob.type || 'application/octet-stream' }))
    setSaved(true)
  }

  return { result, busy, error, saved, run, save }
}

type Tool = ReturnType<typeof useTool>

function Card({ title, subtitle, icon, children, badge }: {
  title: string; subtitle: string; icon: ReactNode; children: ReactNode; badge?: string
}) {
  return (
    <section className="glass rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-1)]/15 text-[var(--color-accent-2)]">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold">{title}</h2>
            {badge && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-[var(--color-text-muted)]">{badge}</span>}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function ResultView({ tool }: { tool: Tool }) {
  if (tool.error) return <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{tool.error}</p>
  if (!tool.result) return null
  const r = tool.result
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-black/30 p-3">
      {r.kind === 'video' ? (
        <video src={r.url} controls className="max-h-56 w-full rounded-lg" />
      ) : (
        <img src={r.url} alt="Result" className="max-h-56 w-full rounded-lg object-contain" />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => downloadBlob(r.blob, r.name)}>
          <Download className="mr-1 h-3.5 w-3.5" /> Download
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void tool.save()} disabled={tool.saved}>
          {tool.saved ? <Check className="mr-1 h-3.5 w-3.5" /> : <Save className="mr-1 h-3.5 w-3.5" />}
          {tool.saved ? 'Saved to Media' : 'Save to Media'}
        </Button>
        <span className="self-center text-[10px] text-[var(--color-text-muted)]">{r.name}</span>
      </div>
    </div>
  )
}

function Action({ tool, label, ready, onClick }: { tool: Tool; label: string; ready: boolean; onClick: () => void }) {
  return (
    <Button className="brand-gradient text-black" disabled={!ready || tool.busy} onClick={onClick}>
      {tool.busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {tool.busy ? 'Working…' : label}
    </Button>
  )
}

function FileRow({ accept, multiple, onChange, label }: {
  accept: string; multiple?: boolean; onChange: (files: File[]) => void; label: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2.5 text-xs hover:border-[var(--color-accent-3)]">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="rounded-md bg-white/10 px-2 py-1 text-[10px]">Choose file</span>
      <input type="file" accept={accept} multiple={multiple} hidden onChange={(e) => onChange(Array.from(e.target.files || []))} />
    </label>
  )
}

function SliderRow({ label, value, min, max, step = 1, suffix = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
        <span>{label}<span className="ml-2 text-[var(--color-text)]">{Number(value.toFixed(2))}{suffix}</span></span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-accent-2)]" />
    </label>
  )
}

function useVideoDuration(file: File | null) {
  const [duration, setDuration] = useState(0)
  useEffect(() => {
    if (!file) { setDuration(0); return }
    let alive = true
    void (async () => {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.src = url
      v.onloadedmetadata = () => {
        if (alive) setDuration(Number.isFinite(v.duration) ? v.duration : 0)
        URL.revokeObjectURL(url)
      }
      v.onerror = () => URL.revokeObjectURL(url)
    })()
    return () => { alive = false }
  }, [file])
  return duration
}

/* ------------------------------ Video tools ------------------------------ */

function TrimTool() {
  const tool = useTool()
  const [file, setFile] = useState<File | null>(null)
  const duration = useVideoDuration(file)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(10)
  useEffect(() => { setStart(0); setEnd(Math.max(1, Math.round(duration))) }, [duration])
  return (
    <Card title="Video Trimmer" subtitle="Cut a clip exactly where you want — real FFmpeg export." icon={<Scissors className="h-4 w-4" />}>
      <FileRow accept="video/*" label={file ? file.name : 'Choose a video'} onChange={(f) => setFile(f[0] || null)} />
      {file && duration > 0 && (
        <>
          <SliderRow label="Start" value={start} min={0} max={Math.max(1, duration - 0.5)} step={0.5} suffix="s" onChange={setStart} />
          <SliderRow label="End" value={Math.min(end, duration)} min={start + 0.5} max={duration} step={0.5} suffix="s" onChange={setEnd} />
          <Action tool={tool} label="Trim video" ready={!!file} onClick={() => void tool.run(() => trimVideo(file, start, Math.min(end, duration)), `trimmed-${file.name}`, 'video')} />
        </>
      )}
      <ResultView tool={tool} />
    </Card>
  )
}

function ConvertTool() {
  const tool = useTool()
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<VideoFormat>('MP4')
  const [resolution, setResolution] = useState('720p')
  const [fps, setFps] = useState(30)
  return (
    <Card title="Video Converter" subtitle="Convert to MP4, WebM or GIF with your chosen size and fps." icon={<RefreshCw className="h-4 w-4" />}>
      <FileRow accept="video/*" label={file ? file.name : 'Choose a video'} onChange={(f) => setFile(f[0] || null)} />
      <div className="grid grid-cols-3 gap-2">
        <Select value={format} options={['MP4', 'WebM', 'GIF'].map((v) => ({ value: v, label: v }))} onChange={(e) => setFormat(e.target.value as VideoFormat)} className="w-full" />
        <Select value={resolution} options={['480p', '720p', '1080p'].map((v) => ({ value: v, label: v }))} onChange={(e) => setResolution(e.target.value)} className="w-full" />
        <Select value={String(fps)} options={[24, 30, 60].map((v) => ({ value: String(v), label: `${v} fps` }))} onChange={(e) => setFps(Number(e.target.value))} className="w-full" />
      </div>
      <Action tool={tool} label="Convert" ready={!!file} onClick={() => void tool.run(() => convertVideo(file!, format, resolution, fps), `converted-${file!.name}`, format === 'GIF' ? 'image' : 'video')} />
      <ResultView tool={tool} />
    </Card>
  )
}

function EnhanceVideoTool() {
  const tool = useTool()
  const [file, setFile] = useState<File | null>(null)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(1)
  const [saturation, setSaturation] = useState(1)
  const [sharpen, setSharpen] = useState(true)
  return (
    <Card title="Video Enhancer" subtitle="Brightness, contrast, saturation and sharpening applied for real." icon={<Wand2 className="h-4 w-4" />}>
      <FileRow accept="video/*" label={file ? file.name : 'Choose a video'} onChange={(f) => setFile(f[0] || null)} />
      <SliderRow label="Brightness" value={brightness} min={-0.3} max={0.3} step={0.02} onChange={setBrightness} />
      <SliderRow label="Contrast" value={contrast} min={0.5} max={2} step={0.05} onChange={setContrast} />
      <SliderRow label="Saturation" value={saturation} min={0} max={3} step={0.05} onChange={setSaturation} />
      <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <input type="checkbox" checked={sharpen} onChange={(e) => setSharpen(e.target.checked)} /> Sharpen
      </label>
      <Action tool={tool} label="Enhance video" ready={!!file} onClick={() => void tool.run(() => enhanceVideo(file!, brightness, contrast, saturation, sharpen), `enhanced-${file!.name}`, 'video')} />
      <ResultView tool={tool} />
    </Card>
  )
}

function GreenScreenTool() {
  const tool = useTool()
  const [file, setFile] = useState<File | null>(null)
  const [hex, setHex] = useState('#00FF00')
  const [similarity, setSimilarity] = useState(0.3)
  return (
    <Card title="Background Remover" subtitle="Green-screen / solid-colour keying with a transparent WebM output." icon={<Eraser className="h-4 w-4" />} badge="Chroma key">
      <FileRow accept="video/*" label={file ? file.name : 'Choose a video with a solid background'} onChange={(f) => setFile(f[0] || null)} />
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent" />
        <span>Background colour</span>
      </div>
      <SliderRow label="Similarity" value={similarity} min={0.05} max={0.8} step={0.05} onChange={setSimilarity} />
      <Action tool={tool} label="Remove background" ready={!!file} onClick={() => void tool.run(() => removeSolidBackground(file!, hex, similarity), `no-bg-${file!.name}`, 'video')} />
      <ResultView tool={tool} />
    </Card>
  )
}

function CaptionsTool() {
  const tool = useTool()
  const [text, setText] = useState('')
  const [seconds, setSeconds] = useState(3)
  const [busy, setBusy] = useState(false)
  /** Reused on every subsequent click so "Open in Studio again" never duplicates. */
  const [studioProjectId, setStudioProjectId] = useState<string | null>(null)
  const lines = useMemo(() => textToCaptions(text, seconds), [text, seconds])

  const addToStudio = async () => {
    if ((!lines.length && !studioProjectId) || busy) return
    setBusy(true)
    try {
      const elements: ProjectElement[] = lines.map((c, i) => ({
        id: v4(), name: `Caption ${i + 1}`, type: 'text', text: c.line,
        x: 120, y: 260 + i * 110, width: 1680, height: 100,
        fontSize: 64, fontWeight: 800, color: '#FFFFFF', textAlign: 'center',
        z: Date.now() + i, locked: false, hidden: false, opacity: 1,
      }))
      const clips = lines.map((c) => ({
        id: v4(), trackId: 'track-captions', start: c.start, duration: c.duration,
        name: c.line, params: {},
      }))
      if (studioProjectId) {
        await useProjects.getState().openProject(studioProjectId)
        if (useProjects.getState().current?.id !== studioProjectId) setStudioProjectId(null)
      }
      if (!studioProjectId || useProjects.getState().current?.id !== studioProjectId) {
        const p = await useProjects.getState().createProject('Auto Captions', 'video', '16:9')
        setStudioProjectId(p.id)
      }
      useProjects.getState().updateCurrent({ elements, clips })
      await useProjects.getState().saveCurrent()
      navigate('/workspace')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Auto Captions" subtitle="Turn your script into timed caption layers on a real Studio timeline." icon={<Captions className="h-4 w-4" />}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Paste your script. Each sentence becomes a caption…" className="w-full resize-none rounded-lg bg-[var(--color-panel)] p-3 text-sm outline-none border border-transparent focus:border-[var(--color-accent-3)]" />
      <SliderRow label="Seconds per caption" value={seconds} min={1} max={8} step={0.5} suffix="s" onChange={setSeconds} />
      <p className="text-xs text-[var(--color-text-muted)]">{lines.length} caption lines ready</p>
      <Button className="brand-gradient text-black" disabled={(!lines.length && !studioProjectId) || busy} onClick={() => void addToStudio()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Film className="mr-2 h-4 w-4" />}
        {studioProjectId ? 'Open in Studio again' : 'Add captions to Studio'}
      </Button>
      <ResultView tool={tool} />
    </Card>
  )
}

/* ------------------------------ Image tools ------------------------------ */

const RESIZE_PRESETS = [
  { label: 'Square 1080', w: 1080, h: 1080 },
  { label: 'Story 9:16', w: 1080, h: 1920 },
  { label: 'Wide 16:9', w: 1920, h: 1080 },
  { label: 'Portrait 4:5', w: 1080, h: 1350 },
]

function ResizeTool() {
  const tool = useTool()
  const [file, setFile] = useState<File | null>(null)
  const [w, setW] = useState(1080)
  const [h, setH] = useState(1080)
  const [fit, setFit] = useState<'cover' | 'contain'>('cover')
  return (
    <Card title="Image Resizer" subtitle="Resize to social presets or your own exact pixels." icon={<Maximize2 className="h-4 w-4" />}>
      <FileRow accept="image/*" label={file ? file.name : 'Choose an image'} onChange={(f) => setFile(f[0] || null)} />
      <div className="flex flex-wrap gap-1.5">
        {RESIZE_PRESETS.map((p) => (
          <button key={p.label} onClick={() => { setW(p.w); setH(p.h) }} className="rounded-md bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10">{p.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" value={w} onChange={(e) => setW(Number(e.target.value))} aria-label="Width" />
        <Input type="number" value={h} onChange={(e) => setH(Number(e.target.value))} aria-label="Height" />
      </div>
      <Select value={fit} options={[{ value: 'cover', label: 'Fill / crop' }, { value: 'contain', label: 'Fit / no crop' }]} onChange={(e) => setFit(e.target.value as 'cover' | 'contain')} className="w-full" />
      <Action tool={tool} label="Resize image" ready={!!file && w > 0 && h > 0} onClick={() => void tool.run(() => resizeImage(file!, w, h, fit), `resized-${file!.name}`, 'image')} />
      <ResultView tool={tool} />
    </Card>
  )
}

function CombineTool() {
  const tool = useTool()
  const [files, setFiles] = useState<File[]>([])
  const [cols, setCols] = useState(2)
  const [w, setW] = useState(1080)
  const [h, setH] = useState(1080)
  return (
    <Card title="Combine Images" subtitle="Merge several photos into one real collage image." icon={<Combine className="h-4 w-4" />}>
      <FileRow accept="image/*" multiple label={files.length ? `${files.length} images selected` : 'Choose 2 or more images'} onChange={setFiles} />
      <div className="grid grid-cols-3 gap-2">
        <Select value={String(cols)} options={[2, 3, 4].map((v) => ({ value: String(v), label: `${v} columns` }))} onChange={(e) => setCols(Number(e.target.value))} className="w-full" />
        <Input type="number" value={w} onChange={(e) => setW(Number(e.target.value))} aria-label="Width" />
        <Input type="number" value={h} onChange={(e) => setH(Number(e.target.value))} aria-label="Height" />
      </div>
      <Action tool={tool} label="Combine" ready={files.length >= 2} onClick={() => void tool.run(() => combineImages(files, cols, w, h), 'pixelcraft-collage.png', 'image')} />
      <ResultView tool={tool} />
    </Card>
  )
}

function ImageEnhanceTool() {
  const tool = useTool()
  const [file, setFile] = useState<File | null>(null)
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [saturation, setSaturation] = useState(1)
  const [blur, setBlur] = useState(0)
  return (
    <Card title="Image Enhancer" subtitle="Fix dull photos with real brightness, contrast and colour." icon={<Palette className="h-4 w-4" />}>
      <FileRow accept="image/*" label={file ? file.name : 'Choose an image'} onChange={(f) => setFile(f[0] || null)} />
      <SliderRow label="Brightness" value={brightness} min={0.2} max={2} step={0.05} onChange={setBrightness} />
      <SliderRow label="Contrast" value={contrast} min={0.2} max={2} step={0.05} onChange={setContrast} />
      <SliderRow label="Saturation" value={saturation} min={0} max={2} step={0.05} onChange={setSaturation} />
      <SliderRow label="Soft blur" value={blur} min={0} max={6} step={0.5} onChange={setBlur} />
      <Action tool={tool} label="Enhance image" ready={!!file} onClick={() => void tool.run(() => enhanceImage(file!, brightness, contrast, saturation, blur), `enhanced-${file!.name}`, 'image')} />
      <ResultView tool={tool} />
    </Card>
  )
}

function MemeTool() {
  const tool = useTool()
  const [file, setFile] = useState<File | null>(null)
  const [top, setTop] = useState('')
  const [bottom, setBottom] = useState('')
  return (
    <Card title="Meme Generator" subtitle="Add classic top and bottom caption text to any photo." icon={<Smile className="h-4 w-4" />}>
      <FileRow accept="image/*" label={file ? file.name : 'Choose an image'} onChange={(f) => setFile(f[0] || null)} />
      <Input value={top} onChange={(e) => setTop(e.target.value)} placeholder="Top text" />
      <Input value={bottom} onChange={(e) => setBottom(e.target.value)} placeholder="Bottom text" />
      <Action tool={tool} label="Make meme" ready={!!file && !!(top || bottom)} onClick={() => void tool.run(() => makeMeme(file!, top, bottom), `meme-${file!.name}`, 'image')} />
      <ResultView tool={tool} />
    </Card>
  )
}

/* ----------------------------- Audio & captions --------------------------- */

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

function SpeechTool() {
  const [text, setText] = useState('')
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voice, setVoice] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => window.speechSynthesis.cancel()
  }, [])

  const speak = () => {
    if (!text.trim()) return
    setError('')
    if (!('speechSynthesis' in window)) { setError('Text to speech is not supported in this browser'); return }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    u.pitch = pitch
    const found = voices.find((v) => v.voiceURI === voice)
    if (found) u.voice = found
    u.onend = () => setSpeaking(false)
    u.onerror = () => { setSpeaking(false); setError('Speech failed') }
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  return (
    <Card title="Text to Speech" subtitle="Hear your script read aloud with your preferred voice." icon={<Volume2 className="h-4 w-4" />}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Type what should be spoken…" className="w-full resize-none rounded-lg bg-[var(--color-panel)] p-3 text-sm outline-none border border-transparent focus:border-[var(--color-accent-3)]" />
      <Select value={voice} options={[{ value: '', label: 'Default voice' }, ...voices.map((v) => ({ value: v.voiceURI, label: v.name }))]} onChange={(e) => setVoice(e.target.value)} className="w-full" />
      <SliderRow label="Speed" value={rate} min={0.5} max={2} step={0.1} suffix="×" onChange={setRate} />
      <SliderRow label="Pitch" value={pitch} min={0.5} max={2} step={0.1} onChange={setPitch} />
      <div className="flex gap-2">
        <Button className="brand-gradient text-black" disabled={!text.trim() || speaking} onClick={speak}>
          <Play className="mr-2 h-4 w-4" /> Speak
        </Button>
        <Button variant="secondary" onClick={() => { window.speechSynthesis?.cancel(); setSpeaking(false) }} disabled={!speaking}>
          <Square className="mr-2 h-4 w-4" /> Stop
        </Button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </Card>
  )
}

function VoiceRecognitionTool() {
  const { createProject, updateCurrent } = useProjects()
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const recRef = useRef<RecognitionLike | null>(null)

  const supported = typeof window !== 'undefined' && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)

  const start = () => {
    setError('')
    const Ctor = (window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => RecognitionLike }).webkitSpeechRecognition
    if (!Ctor) { setError('Voice recognition is not supported in this browser. Try Chrome.'); return }
    const rec = new Ctor()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript + ' '
      setTranscript(text.trim())
      setSaved(false)
    }
    rec.onerror = (e) => { setError(e.error || 'Recognition failed'); setListening(false) }
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  const stop = () => { recRef.current?.stop(); setListening(false) }

  const makeCaptions = async () => {
    const lines = textToCaptions(transcript, 3)
    if (!lines.length) return
    const elements: ProjectElement[] = lines.map((c, i) => ({
      id: v4(), name: `Voice caption ${i + 1}`, type: 'text', text: c.line,
      x: 120, y: 300 + i * 110, width: 1680, height: 100,
      fontSize: 64, fontWeight: 800, color: '#00E5FF', textAlign: 'center',
      z: Date.now() + i, locked: false, hidden: false, opacity: 1,
    }))
    const clips = lines.map((c) => ({ id: v4(), trackId: 'track-captions', start: c.start, duration: c.duration, name: c.line, params: {} }))
    await createProject('Voice Captions', 'video', '16:9')
    updateCurrent({ elements, clips })
    setSaved(true)
    navigate('/workspace')
  }

  return (
    <Card title="Voice Recognition" subtitle="Dictate from your microphone and turn the words into captions." icon={<Mic className="h-4 w-4" />}>
      <div className="flex gap-2">
        <Button className="brand-gradient text-black" disabled={!supported || listening} onClick={start}><Mic className="mr-2 h-4 w-4" /> Start listening</Button>
        <Button variant="secondary" disabled={!listening} onClick={stop}>Stop</Button>
      </div>
      <textarea value={transcript} onChange={(e) => { setTranscript(e.target.value); setSaved(false) }} rows={3} placeholder="Your spoken words will appear here…" className="w-full resize-none rounded-lg bg-[var(--color-panel)] p-3 text-sm outline-none border border-transparent focus:border-[var(--color-accent-3)]" />
      <Button variant="secondary" disabled={!transcript.trim() || saved} onClick={() => void makeCaptions()}><Captions className="mr-2 h-4 w-4" /> Make caption project</Button>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {!supported && <p className="text-[10px] text-[var(--color-text-muted)]">Use Chrome or Edge for microphone recognition.</p>}
    </Card>
  )
}

function CaptionTemplatesTool() {
  const { createProject, updateCurrent } = useProjects()
  const [busy, setBusy] = useState(false)
  const styles = [
    { name: 'Bold White', color: '#FFFFFF', weight: 800, bg: '#111318' },
    { name: 'Cyan Pop', color: '#00E5FF', weight: 900, bg: '#0B0C10' },
    { name: 'Neon Purple', color: '#A78BFA', weight: 800, bg: '#120A24' },
    { name: 'Warm Yellow', color: '#FBBF24', weight: 700, bg: '#1A1408' },
  ]

  const useStyle = async (s: typeof styles[number]) => {
    if (busy) return
    setBusy(true)
    try {
      const elements: ProjectElement[] = [
        { id: v4(), name: 'Caption headline', type: 'text', text: 'YOUR CAPTION HERE', x: 140, y: 460, width: 1640, height: 120, fontSize: 92, fontWeight: s.weight, color: s.color, textAlign: 'center', z: Date.now(), locked: false, hidden: false, opacity: 1 },
      ]
      await createProject(`${s.name} Captions`, 'video', '16:9')
      updateCurrent({ elements, background: s.bg, clips: [{ id: v4(), trackId: 'track-captions', start: 0, duration: 4, name: 'YOUR CAPTION HERE', params: {} }] })
      navigate('/workspace')
    } finally { setBusy(false) }
  }

  return (
    <Card title="Caption Templates" subtitle="Ready caption styles that open as editable Studio layers." icon={<LayoutTemplate className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2">
        {styles.map((s) => (
          <button key={s.name} disabled={busy} onClick={() => void useStyle(s)} className="rounded-lg p-3 text-left transition hover:border-[var(--color-accent-3)]" style={{ background: s.bg, border: '1px solid var(--color-border)' }}>
            <span className="block text-sm font-extrabold" style={{ color: s.color }}>Aa</span>
            <span className="text-[10px] text-white/60">{s.name}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

/* ------------------------------ Other tabs -------------------------------- */

const AI_MODELS = [
  'GPT Image 2', 'Nano Banana Pro', 'Seedream 5.0', 'Seedream 5.0 Pro',
  'Seedream 5.5', 'Dreamina Seedance 2.0', 'Dreamina Seedance 2.0 Mini',
  'Dreamina Seedance 2.5', 'Sora 2', 'Veo 3.1',
]

const SOLUTIONS = [
  { label: 'Social media videos', category: 'TikTok' },
  { label: 'Brand content', category: 'Business' },
  { label: 'Ad creative', category: 'Marketing' },
  { label: 'Lifestyle videos', category: 'Instagram' },
  { label: 'Logo design', category: 'Logo' },
  { label: 'Poster design', category: 'Marketing' },
  { label: 'Holidays', category: 'Event' },
  { label: 'Birthdays', category: 'Birthday' },
  { label: 'Weddings', category: 'Canva' },
  { label: 'Anniversaries', category: 'Canva' },
  { label: 'Filmmakers and studios', category: 'CapCut' },
]

const TABS: Array<{ id: Kind; label: string; icon: ReactNode }> = [
  { id: 'video', label: 'Video tools', icon: <Film className="h-4 w-4" /> },
  { id: 'image', label: 'Image tools', icon: <ImageIcon className="h-4 w-4" /> },
  { id: 'audio', label: 'Audio & Captions', icon: <Mic className="h-4 w-4" /> },
  { id: 'ai', label: 'AI models', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'solutions', label: 'Solutions', icon: <Layers className="h-4 w-4" /> },
]

export default function ToolsHub() {
  const location = useLocation()
  // The URL is the single source of truth: deep links and back/forward work.
  const tab = useMemo<Kind>(() => {
    const fromUrl = new URLSearchParams(location.split('?')[1] || '').get('tab') || ''
    return (['video', 'image', 'audio', 'ai', 'solutions'] as string[]).includes(fromUrl) ? fromUrl as Kind : 'video'
  }, [location])
  const { current } = useProjects()
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 glass-strong border-b border-[var(--color-border)] px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <h1 className="font-display text-xl font-bold">PixelCraft Tools</h1>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-[var(--color-text-muted)]">Real files · no placeholders</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {TABS.map((item) => (
              <button key={item.id} onClick={() => navigate(`/tools?tab=${item.id}`)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${tab === item.id ? 'brand-gradient text-black' : 'bg-white/5 hover:bg-white/10'}`}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {!current && (
          <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-xs text-[var(--color-text-muted)]">
            Tip: open <button className="text-[var(--color-accent-2)] underline" onClick={() => navigate('/workspace')}>Pro Studio</button> once to create a project. Tools work without it, but saving results into a project is easier.
          </div>
        )}

        {tab === 'video' && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TrimTool /><ConvertTool /><EnhanceVideoTool /><GreenScreenTool /><CaptionsTool />
          </div>
        )}

        {tab === 'image' && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ResizeTool /><CombineTool /><ImageEnhanceTool /><MemeTool />
            <Card title="Photo Editor" subtitle="Open the full canvas editor with layers and shapes." icon={<ImageIcon className="h-4 w-4" />}>
              <Button variant="secondary" onClick={() => navigate('/editor/' + (current?.id || ''))} disabled={!current}>Open Photo Editor</Button>
              {!current && <p className="text-[10px] text-[var(--color-text-muted)]">Create a project in Pro Studio first.</p>}
            </Card>
            <Card title="Text Remover · People Remover · AI Inpainting · Face Cutout" subtitle="These need a generative AI model with server credentials." icon={<Sparkles className="h-4 w-4" />} badge="AI key required">
              <p className="text-xs text-[var(--color-text-muted)]">Add an API key in Render Environment, then these can be turned on. We do not pretend they work offline.</p>
              <Button variant="secondary" onClick={() => navigate('/ai')}>Open AI Studio</Button>
            </Card>
          </div>
        )}

        {tab === 'audio' && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SpeechTool /><VoiceRecognitionTool /><CaptionTemplatesTool />
            <Card title="Caption templates & voice enhancer" subtitle="Caption styles are live. Voice enhancement needs an AI audio model." icon={<Volume2 className="h-4 w-4" />} badge="Partial">
              <p className="text-xs text-[var(--color-text-muted)]">Use Caption Templates on the left to create styled caption layers. Custom voice and voice enhancement require provider keys.</p>
            </Card>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <h2 className="font-display text-lg font-semibold">AI models</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Click a model to save it as the active model in Settings and open AI Studio. Image generation uses your secure OpenAI backend key; only models your provider actually supports will succeed. Use <code>dall-e-3</code> in Settings for images if a preset fails.</p>
              <Button className="brand-gradient mt-4 text-black" onClick={() => navigate('/ai')}><Sparkles className="mr-2 h-4 w-4" /> Open AI Studio</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {AI_MODELS.map((m) => (
                <button
                  key={m}
                  className="glass rounded-xl p-4 text-left text-xs transition hover:border-[var(--color-accent-3)]"
                  onClick={() => {
                    void saveSettings({ ...useSettings.getState(), aiModel: m })
                    navigate('/ai')
                  }}
                  title={`Set active model to ${m} and open AI Studio`}
                >
                  <Sparkles className="mb-2 h-4 w-4 text-[var(--color-accent-2)]" />
                  <p className="font-medium">{m}</p>
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">Set model → AI Studio</p>
                </button>
              ))}
            </div>
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold">Plugins (CapCut × ChatGPT)</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Third-party plugins cannot be embedded inside PixelCraft. Export a project JSON or media file and use it in your other tools instead.</p>
            </div>
          </div>
        )}

        {tab === 'solutions' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SOLUTIONS.map((s) => (
              <button key={s.label} onClick={() => navigate(`/templates?category=${encodeURIComponent(s.category)}`)} className="glass rounded-xl p-5 text-left transition hover:border-[var(--color-accent-3)]">
                <LayoutTemplate className="mb-3 h-5 w-5 text-[var(--color-accent-2)]" />
                <p className="font-medium">{s.label}</p>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">Browse {s.category} templates →</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
