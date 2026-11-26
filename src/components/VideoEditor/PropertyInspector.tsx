import { SlidersHorizontal, Zap, Palette, Gauge, Download, PlayCircle, Type } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useEditor } from '../../store/editor'
import { useProjects } from '../../store/projectsStore'
import { Button } from '../../components/ui/Button'
import { exportVideo } from '../../lib/exportVideo'

const FIELDS = ['x', 'y', 'width', 'height'] as const

export default function PropertyInspector() {
  const { selectedClipId, selectedElementId } = useEditor()
  const ed = useEditor()
  const { current: project } = useProjects()
  const clip = ed.clips.find((c) => c.id === selectedClipId)
  const el = ed.elements.find((e) => e.id === selectedElementId)

  const Slider = ({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) => (
    <label className="flex flex-col gap-1 text-[10px] text-[var(--color-text-muted)]">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step || 0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  )

  const exportWithFeedback = async () => {
    if (!project) return
    const msg = ed.selectedClipId
      ? `Exported project: ${project.name}`
      : 'Project has no clips yet — add media from the rail to the timeline.'
    const blob = await exportVideo({ project })
    if (blob) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${project.name}.mp4`
      a.click()
      alert(`${msg}\nVideo MP4 exported!`)
    } else {
      alert(msg + '\nFFmpeg encoder unavailable — JSON export path below.')
      const pj = project
      const blob = new Blob([JSON.stringify(pj, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${project.name}.pixelcraft.json`
      a.click()
    }
  }

  return (
    <aside className="w-64 shrink-0 glass-strong border-l border-[var(--color-border)] animate-slide-in overflow-y-auto">
      <div className="p-4 border-b border-[var(--color-border)] space-y-1">
        <h3 className="font-display font-semibold text-sm">Properties</h3>
        <p className="text-[10px] text-[var(--color-text-muted)]">
          {clip ? `Selected clip: ${clip.name || 'Clip'}` : el ? 'Selected element' : 'Select a clip or element'}
        </p>
      </div>

      <div className="p-4 space-y-5">
        {/* Transform */}
        <section className="glass rounded-lg p-3 space-y-2 animate-fade-in">
          <h4 className="font-medium text-xs flex items-center gap-2 text-[var(--color-text)]"><SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-accent-2)]" /> Transform</h4>
          {clip && (
            <>
              <Slider label="Start (s)" value={clip.start} min={0} max={Math.max(clip.start + 1, 10)} step={0.01} onChange={(v) => ed.moveClip(clip.id, v)} />
              <Slider label="Duration (s)" value={clip.duration} min={0.2} max={10} step={0.05} onChange={(v) => ed.resizeClip(clip.id, v)} />
              <Slider label="Speed (×)" value={clip.rate ?? 1} min={0.25} max={4} step={0.05} onChange={(v) => ed.resizeClip(clip.id, clip.duration * 1 / v)} />
              <Slider label="Opacity" value={clip.rate ?? 1} min={0.25} max={4} step={0.05} onChange={(v) => ed.resizeClip(clip.id, (clip.duration ?? 1) * (v ?? 1) * (v ?? 1))} />
            </>
          )}
          {el && (
            <>
              {FIELDS.map((k) => (
                <Slider
                  key={k}
                  label={k}
                  value={(el[k] as number) ?? 0}
                  min={0}
                  max={project?.canvasWidth || 1920}
                  onChange={(v) => ed.updateElement(el.id, { [k]: v })}
                />
              ))}
              <Slider label="Opacity" value={el.opacity ?? 1} min={0} max={1} step={0.05} onChange={(v) => ed.updateElement(el.id, { opacity: v })} />
            </>
          )}
        </section>

        {/* Colors */}
        <section className="glass rounded-lg p-3 space-y-2 animate-fade-in">
          <h4 className="font-medium text-xs flex items-center gap-2 text-[var(--color-text)]"><Palette className="h-3.5 w-3.5 text-[var(--color-accent-2)]" /> Colors</h4>
          <div className="flex gap-2">
            {['#a371f7', '#22d3ee', '#22c55e', '#f59e0b', '#ef4444', '#f472b6'].map((c) => (
              <button
                key={c}
                className={cn('w-6 h-6 rounded-md border border-[var(--color-border)]', c === '#a371f7' && 'ring-2 ring-[var(--color-accent-3)])}')}
                style={{ background: c }}
                onClick={() => ed.updateElement(el?.id || clip?.id || '', { color: c })}
              />
            ))}
          </div>
        </section>

        {/* Speed & Effects */}
        <section className="glass rounded-lg p-3 space-y-2 animate-fade-in">
          <h4 className="font-medium text-xs flex items-center gap-2 text-[var(--color-text)]"><Zap className="h-3.5 w-3.5 text-[var(--color-warning)]" /> Speed & Effects</h4>
          <Slider label="Speed" value={ed.playbackRate} min={0.25} max={4} step={0.05} onChange={(v) => ed.setPlaybackRate(v)} />
          <Slider label="Brightness" value={0} min={-1} max={1} step={0.05} onChange={() => {}} />
          <Slider label="Contrast" value={0} min={-1} max={1} step={0.05} onChange={() => {}} />
          <Slider label="Saturation" value={1} min={0} max={2} step={0.05} onChange={() => {}} />
          <Slider label="Blur" value={0} min={0} max={10} step={0.5} onChange={() => {}} />
          {clip && <Slider label="Clip opacity" value={clip.rate ?? 1} min={0.25} max={4} step={0.05} onChange={(v) => ed.resizeClip(clip.id, (clip.duration ?? 1) * (v ?? 1))} />}
        </section>

        {/* Export panel */}
        <section className="glass rounded-lg p-3 space-y-2 animate-fade-in">
          <h4 className="font-medium text-xs flex items-center gap-2 text-[var(--color-text)]"><Gauge className="h-3.5 w-3.5 text-[var(--color-accent-2)]" /> Export</h4>
          <Slider label="Resolution" value={1080} min={360} max={3840} step={120} onChange={() => {}} />
          <Slider label="Frame Rate" value={30} min={12} max={60} step={1} onChange={() => {}} />
          <Slider label="Quality" value={85} min={60} max={100} step={1} onChange={() => {}} />
          <Button onClick={() => void exportWithFeedback()}>
            <Download className="h-3.5 w-3.5" />
            Export MP4
          </Button>
        </section>

        {/* Teleport to editor note */}
        {clip && (
          <div className="glass rounded-lg p-2 text-[10px] text-[var(--color-text-muted)]">
            Double-click a clip to open the media editor preview. <PlayCircle className="inline h-3 w-3" />
          </div>
        )}
        <div className="glass rounded-lg p-2 text-[10px] text-[var(--color-text-muted)]">
          <Type className="inline h-3 w-3" /> Studio mode: drag-only scaffold; full editing continues in the editor view.
        </div>
      </div>
    </aside>
  )
}
