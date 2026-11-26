import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useProjects } from '../../store/projectsStore'
import { useEditor } from '../../store/editor'
import { isFFmpegAvailable, exportVideo } from '../../lib/exportVideo'
import { downloadBlob } from '../../lib/projects'
import { transcribeAudio } from '../../lib/ai'
import { Play, Pause, Maximize2 } from 'lucide-react'

export default function VideoEditor() {
  const { current: project } = useProjects()
  const ed = useEditor()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [exportMsg, setExportMsg] = useState('')
  const [ffmpegReady, setFfmpegReady] = useState(false)
  const [subtitle, setSubtitle] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v || !project) return
    const onTime = () => ed.setTime(v.currentTime)
    v.addEventListener('timeupdate', onTime)
    const onSeek = (e: Event) => {
      const t = (e as CustomEvent).detail?.time as number
      if (typeof t === 'number' && Math.abs(t - v.currentTime) > 0.1) v.currentTime = t
    }
    window.addEventListener('pixelcraft:seek', onSeek)
    void isFFmpegAvailable().then(setFfmpegReady)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      window.removeEventListener('pixelcraft:seek', onSeek)
    }
  }, [project, ed])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
    ed.togglePlay()
  }

  const setRate = (r: number) => {
    const v = videoRef.current
    if (v) v.playbackRate = r
    ed.setPlaybackRate(r)
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!v || !f) return
    setFile(f)
    v.src = URL.createObjectURL(f)
    v.load()
    v.onloadedmetadata = () => {
      const start = Math.max(0, ed.time + 1)
      ed.addClip({
        trackId: project?.tracks.find((t) => t.type === 'video')?.id || 'track-v',
        start,
        duration: Math.max(0.2, v.duration || 2),
        src: v.src || undefined,
        name: f.name,
      })
    }
  }

  const exportMpeg = async () => {
    setExportMsg('')
    const blob = await exportVideo({ project: project!, onProgress: setExportMsg })
    if (blob) downloadBlob(blob, `${project!.name}.mp4`)
  }

  if (!project) return null

  return (
    <div className="relative h-full flex flex-col gap-3 p-4 animate-slide-in">
      <div className="glass rounded-xl p-4 flex items-center gap-4 flex-wrap glass-strong shadow-2xl">
        <video ref={videoRef} className="max-h-[60vh] rounded-lg bg-[var(--color-panel)] shadow-2xl" muted onClick={togglePlay} />
        <div className="flex flex-col gap-2 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={togglePlay}>
              {ed.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {ed.playing ? 'Pause' : 'Play'}
            </Button>
            <input type="range" min={0} max={4} step={0.1} value={ed.playbackRate} onChange={(e) => setRate(Number(e.target.value))} className="w-20" aria-label="Playback speed" />
            <span>×{ed.playbackRate.toFixed(1)}</span>
            <input type="range" min={0} max={1} step={0.05} value={ed.volume} onChange={(e) => ed.setVolume(Number(e.target.value))} className="w-20" aria-label="Volume" />
            <span>vol {Math.max(0, Math.round(ed.volume * 100))}%</span>
            <Button size="sm" variant="accent" className="text-black" onClick={() => void isFFmpegAvailable()}>
              {ffmpegReady ? 'FFmpeg loaded ✓' : 'Load FFmpeg'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" accept="video/*" onChange={(e) => onFile(e)} className="hidden" id="vclip-input" />
            <label htmlFor="vclip-input" className="cursor-pointer rounded px-3 py-1.5 bg-[var(--color-panel)] border border-[var(--color-border)] text-xs hover:border-[var(--color-accent-3)]">
              Import to timeline
            </label>
            <Button size="sm" onClick={() => file && void transcribeAudio(file).then(setSubtitle).catch((e) => setSubtitle(String(e)))} disabled={!file}>
              Transcribe → Subtitles (AI)
            </Button>
          </div>
          {exportMsg && <span className="text-[var(--color-accent-2)]">{exportMsg}</span>}
        </div>
        <Button onClick={() => void exportMpeg()} className="ml-auto brand-gradient text-black">
          Export MP4{ffmpegReady ? '' : ' (FFmpeg needed)'}
        </Button>
        <button className="glass rounded-lg p-2.5" aria-label="Full screen placeholder">
          <Maximize2 className="h-4 w-4 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {subtitle && (
        <div className="glass rounded-xl p-3 animate-slide-up">
          <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Subtitles (AI transcription)</span>
          <pre className="mt-2 text-xs text-[var(--color-text)] whitespace-pre-wrap max-h-36 overflow-y-auto">
            {subtitle}
          </pre>
        </div>
      )}
    </div>
  )
}
