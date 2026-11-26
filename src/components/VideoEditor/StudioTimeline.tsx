import { useRef, useState } from 'react'
import { useProjects } from '../../store/projectsStore'
import { useEditor } from '../../store/editor'
import { cn } from '../../lib/utils'
import { Circle, Repeat, Music, Trash2, Lock, Unlock, VolumeX, Dot } from 'lucide-react'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')}`
}

export default function StudioTimeline() {
  const { current: project } = useProjects()
  const ed = useEditor()
  const clips = useEditor().clips
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  if (!project) return null

  const tracks = project.tracks.length > 0 ? project.tracks : [
    { id: 't1', name: 'Video', type: 'video' as const },
    { id: 't2', name: 'Overlay', type: 'image' as const },
    { id: 't3', name: 'Audio', type: 'audio' as const },
    { id: 't4', name: 'Captions', type: 'text' as const },
  ]

  const total = Math.max(...clips.map((c) => c.start + c.duration), 4)
  const pxPerSec = 70

  const onClickTrack = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const t = (e.clientX - rect.left) / pxPerSec
    ed.setTime(Math.max(0, t))
    window.dispatchEvent(new CustomEvent('pixelcraft:seek', { detail: { time: Math.max(0, t) } }))
  }

  return (
    <div className="glass-strong border-t border-[var(--color-border)] shadow-2xl animate-slide-in flex flex-col" style={{ height: 280 }}>
      {/* Header controls */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] flex-wrap">
        <span className="text-xs font-mono text-[var(--color-text-muted)]">{fmt(ed.time)}</span>
        <Button variant="outline" size="sm" onClick={() => { const id = ed.selectedClipId; if (id) ed.trimClip(id, 0, 1) }}>Trim</Button>
        <Button variant="outline" size="sm" onClick={() => { const id = ed.selectedClipId; if (id) ed.splitClip(id, ed.time) }}>Split</Button>
        <Button variant="destructive" size="sm" onClick={() => { const id = ed.selectedClipId; if (id) ed.deleteClip(id) }}>Delete</Button>
        <Button variant="secondary" size="sm" onClick={() => ed.setVolume(ed.volume === 0 ? 1 : 0)}><VolumeX className="h-3.5 w-3.5" /> Mute</Button>
        <div className="ml-auto flex gap-2 text-[9px] text-[var(--color-text-muted)]">
          <div className="glass px-2 py-1"><Repeat className="inline h-3 w-3 mr-1" />Loop</div>
          <div className="glass px-2 py-1"><Music className="inline h-3 w-3 mr-1" />Audio</div>
          <div className="glass px-2 py-1"><Dot className="inline h-3 w-3 mr-1 text-[var(--color-accent-3)]" />Scrubbing</div>
        </div>
      </div>

      {/* Playhead + ruler */}
      <div className="relative h-6 border-b border-[var(--color-border)]" style={{ width: total * pxPerSec + 80 }}>
        {Array.from({ length: Math.floor(total) + 1 }).map((_e, i) => (
          <span key={i} className="absolute top-0 h-3 w-px bg-[var(--color-border)]" style={{ left: 40 + i * pxPerSec }}>
            <span className="absolute -top-3 -left-1 text-[9px] text-[var(--color-text-muted)]">{i}</span>
          </span>
        ))}
        <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-[var(--color-danger)] to-[var(--color-warning)] -translate-x-0.5 z-10" style={{ left: 40 + ed.time * pxPerSec }} />
        <div className="absolute inset-0 flex items-center px-4 justify-center">
          <div className="w-1.5 h-6 bg-[var(--color-text)] rounded" style={{ left: 40 + ed.time * pxPerSec, transform: 'translateX(-50%)' }} />
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-auto" ref={trackRef} onClick={onClickTrack}>
        <div className="relative" style={{ width: total * pxPerSec + 80, height: tracks.length * 56 }}>
          {tracks.map((track) => (
            <div key={track.id} className="flex h-14 border-b border-[var(--color-border)] bg-[var(--color-panel-2)]">
              <div className="w-20 shrink-0 px-2 flex items-center text-xs border-r border-[var(--color-border)]">
                <span className="text-[9px] uppercase tracking-wide text-[var(--color-text-muted)]">{track.type}</span>
                <div className="ml-auto flex gap-1">
                  <button className="h-6 w-6 rounded glass text-[var(--color-text-muted)]"><Lock className="h-3 w-3" /></button>
                  <button className="h-6 w-6 rounded glass text-[var(--color-text-muted)]"><Unlock className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="flex-1 relative h-14">
                {clips.filter((c) => c.trackId === track.id).map((clip) => {
                  const left = 40 + clip.start * pxPerSec
                  const w = Math.max(80, clip.duration * pxPerSec)
                  return (
                    <div
                      key={clip.id}
                      className={cn('absolute top-1 bottom-1 rounded-lg flex items-center px-2 text-[10px] text-black font-semibold cursor-grab shadow-sm border border-black/20', 'bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-3)]', ed.selectedClipId === clip.id && 'ring-2 ring-[var(--color-accent-2)]')}
                      style={{ left, width: w }}
                      onMouseEnter={() => setHover(clip.id)}
                      onClick={() => ed.setSelectedClip(clip.id)}
                    >
                      <span className="truncate flex-1">{clip.name || 'Clip'}</span>
                      {hover === clip.id && <span className="text-[8px]"><Circle className="h-3 w-3" /></span>}
                      <Trash2 className="h-3 w-3" />
                    </div>
                  )
                })}
                {clips.filter((c) => c.trackId === track.id).length === 0 && <span className="absolute left-24 top-2 text-[10px] text-[var(--color-text-muted)] opacity-50">Drop clips here</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { Button } from '../../components/ui/Button'
