import { useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, VolumeX, Volume2, Maximize2, Crop } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useProjects } from '../../store/projectsStore'
import { useEditor } from '../../store/editor'

const ASPECTS = [
  { value: '9:16', label: '9:16 (TikTok)' },
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:5', label: '4:5 (Portrait)' },
]

export default function StudioCenter() {
  const { current: project } = useProjects()
  const ed = useEditor()
  const videoRef = useRef<HTMLVideoElement | null>(null)

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

  const seekTo = (sec: number) => {
    const v = videoRef.current
    if (v) v.currentTime = sec
    ed.setTime(sec)
  }

  if (!project) return null

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 animate-slide-in">
      {/* Aspect ratio badge */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span className="glass rounded px-2 py-1">{project.aspectRatio}</span>
        <Select
          value={project.aspectRatio}
          options={ASPECTS}
          onChange={(e) => void useProjects.getState().updateCurrent({ aspectRatio: e.target.value as typeof project.aspectRatio })}
          className="w-40"
          aria-label="Aspect ratio"
        />
      </div>

      {/* Preview stage */}
      <div className="relative w-full max-w-3xl aspect-video glass rounded-2xl shadow-2xl overflow-hidden border border-[var(--color-border)]">
        <video ref={videoRef} className="w-full h-full object-cover" muted={ed.volume === 0} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 text-white cursor-pointer" onClick={togglePlay}>
          {ed.playing ? <Pause className="h-16 w-16" /> : <Play className="h-16 w-16" />}
          <span className="text-sm text-white/70">Click to {ed.playing ? 'pause' : 'play'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(1, ed.time + 5)}
          step={0.05}
          value={ed.time}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="absolute bottom-2 left-3 right-3 z-20 accent-[var(--color-accent-2)]"
          aria-label="Scrub preview"
        />
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
        <Button variant="outline" size="sm" onClick={() => seekTo(Math.max(0, ed.time - 5))}>
          <SkipBack className="h-4 w-4" /> Step back 5s
        </Button>
        <Button variant="outline" size="sm" onClick={() => seekTo(ed.time + 5)}>
          <SkipForward className="h-4 w-4" /> Step forward 5s
        </Button>
        <Button size="sm" onClick={togglePlay}>
          <Play className="h-4 w-4" /> Play
        </Button>
        <div className="w-px bg-[var(--color-border)] mx-1 h-6" />
        <input type="range" min={0} max={4} step={0.1} value={ed.playbackRate} onChange={(e) => setRate(Number(e.target.value))} className="w-24" aria-label="Playback speed" />
        <span className="text-xs text-[var(--color-text-muted)]">×{ed.playbackRate.toFixed(1)}</span>
        <div className="w-px bg-[var(--color-border)] mx-1 h-6" />
        <Button variant={ed.volume === 0 ? 'destructive' : 'outline'} size="sm" onClick={() => ed.setVolume(ed.volume === 0 ? 0.8 : 0)}>
          {ed.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} Mute
        </Button>
        <input type="range" min={0} max={1} step={0.05} value={ed.volume} onChange={(e) => ed.setVolume(Number(e.target.value))} className="w-20" aria-label="Volume" />
        <div className="w-px bg-[var(--color-border)] mx-1 h-6" />
        <Button variant="outline" size="sm">
          <Crop className="h-4 w-4" /> Crop
        </Button>
        <Button variant="outline" size="sm">
          <Maximize2 className="h-4 w-4" /> Full
        </Button>
      </div>
    </div>
  )
}
