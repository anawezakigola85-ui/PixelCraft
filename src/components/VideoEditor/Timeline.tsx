import { useEffect, useMemo, useRef } from 'react'
import { useProjects } from '../../store/projectsStore'
import { useEditor } from '../../store/editor'
import { cn } from '../../lib/utils'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')}`
}

export default function Timeline() {
  const { current: project } = useProjects()
  const ed = useEditor()
  const clips = useEditor().clips
  const tracks = useMemo(() => project?.tracks ?? [], [project])
  const zoom = ed.timelineZoom
  const PX_PER_SEC = 80 * zoom

  const trackRef = useRef<HTMLDivElement | null>(null)
  const dragStart = useRef<{ id: string; startX: number; startTime: number } | null>(null)
  const playheadLeft = ed.time * PX_PER_SEC + 40

  if (!project) return null

  const total = Math.max(...clips.map((c) => c.start + c.duration), 2)
  const width = total * PX_PER_SEC + 40

  const onTrackClick = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const t = (clientX - rect.left) / PX_PER_SEC
    ed.setTime(Math.max(0, t))
    window.dispatchEvent(new CustomEvent('pixelcraft:seek', { detail: { time: Math.max(0, t) } }))
  }

  const onDragStart = (e: React.MouseEvent, clip: (typeof clips)[0]) => {
    e.preventDefault()
    dragStart.current = { id: clip.id, startX: e.clientX, startTime: clip.start }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragStart.current
      if (!d) return
      const dx = (e.clientX - d.startX) / PX_PER_SEC
      const clip = clips.find((c) => c.id === d.id)
      if (clip) ed.moveClip(d.id, d.startTime + dx)
    }
    const onEnd = () => (dragStart.current = null)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
    }
  }, [ed, clips, PX_PER_SEC])

  return (
    <div className="glass-strong border-t border-[var(--color-border)] shadow-2xl animate-slide-in" style={{ height: 220 }}>
      {/* Controls bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)]">
        <span className="text-xs font-mono text-[var(--color-text-muted)]">{fmt(ed.time)}</span>
        <div className="flex gap-2">
          {([
            ['Split', () => { const id = ed.selectedClipId || clips[0]?.id; if (id) ed.splitClip(id, ed.time) }, 'Split at playhead'],
            ['Delete', () => { const id = ed.selectedClipId || clips[0]?.id; if (id) ed.deleteClip(id) }, 'Delete clip'],
          ] as const).map(([label, fn, title]) => (
            <button
              key={label}
              className="h-7 px-3 text-xs rounded-lg glass-strong text-[var(--color-text)] hover:bg-[var(--color-panel-2)]"
              onClick={fn}
              disabled={!ed.selectedClipId && !clips[0]}
              title={title}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="h-7 px-2.5 text-xs rounded-lg glass-strong text-[var(--color-text)]" onClick={() => ed.setTimelineZoom(ed.timelineZoom > 1 ? ed.timelineZoom - 0.5 : 1)}>−</button>
          <button className="h-7 px-2.5 text-xs rounded-lg glass-strong text-[var(--color-text)]" onClick={() => ed.setTimelineZoom(ed.timelineZoom + 0.5)}>+</button>
        </div>
      </div>

      {/* Ruler */}
      <div className="flex h-6 items-center px-4 relative border-b border-[var(--color-border)]" style={{ width }}>
        {Array.from({ length: Math.floor(total) + 1 }).map((_el, i) => (
          <span
            key={i}
            className="absolute h-3 w-px bg-[var(--color-border)]"
            style={{ left: i * PX_PER_SEC + 40, top: 0 }}
          >
            <span className="absolute -top-4 -left-1 text-[9px] text-[var(--color-text-muted)]">{fmt(i)}</span>
          </span>
        ))}
        <div
          className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--color-danger)] to-[var(--color-warning)] -translate-x-0.5 pointer-events-none z-10"
          style={{ left: playheadLeft }}
        />
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-auto" ref={trackRef} onClick={(e) => onTrackClick(e.clientX)}>
        <div className="relative" style={{ width, height: tracks.length * 44 }}>
          {tracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center h-11 border-b border-[var(--color-border)] bg-[var(--color-panel-2)] first:rounded-t-lg"
              style={{ height: 44 }}
            >
              <div className="w-16 px-3 text-xs font-medium text-[var(--color-text-muted)] border-r border-[var(--color-border)] shrink-0 flex items-center">
                {track.type === 'video' ? 'VIDEO' : track.type === 'audio' ? 'AUDIO' : track.type === 'text' ? 'TEXT' : 'IMAGE'}
              </div>
              <div className="flex-1 relative h-full">
                {clips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => {
                    const left = clip.start * PX_PER_SEC + 40
                    const clipW = Math.max(80, clip.duration * PX_PER_SEC)
                    return (
                      <div
                        key={clip.id}
                        className={cn(
                          'absolute top-1 bottom-1 rounded-lg flex items-center justify-between border cursor-grab shadow-sm',
                          'border-[var(--color-border-hover)] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-3)] text-black text-[10px]',
                          ed.selectedClipId === clip.id && 'ring-2 ring-[var(--color-accent-2)] shadow-md',
                        )}
                        style={{ left, width: clipW }}
                        onMouseDown={(e) => onDragStart(e, clip)}
                        onClick={() => ed.setSelectedClip(clip.id)}
                      >
                        <div className="w-2 border-r border-black/15"></div>
                        <span className="px-2 truncate flex-1 font-semibold">{clip.name || 'Clip'}</span>
                        {clip.duration > 0.4 && <div className="w-2 border-l border-black/15"></div>}
                      </div>
                    )
                  })}
                {clips.filter((c) => c.trackId === track.id).length === 0 && (
                  <span className="absolute left-16 text-[10px] text-[var(--color-text-muted)] opacity-60">Drop clips here</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
