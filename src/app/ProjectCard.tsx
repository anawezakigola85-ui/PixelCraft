import { useEffect, useRef } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { Project } from '../lib/types'

function projectColors(type: string) {
  switch (type) {
    case 'video':
      return ['#a371f7', '#22d3ee']
    case 'graphics':
      return ['#f59e0b', '#ef4444']
    case 'social':
      return ['#22c55e', '#8b5cf6']
    default:
      return ['#3b82f6', '#8b5cf6']
  }
}

const typeLabel: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  graphics: 'Design',
  social: 'Social',
}

export function ProjectCard({
  project,
  onOpen,
  onRename,
}: {
  project: Project
  onOpen: () => void
  onRename: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const c1 = projectColors(project.type)[0]
  const c2 = projectColors(project.type)[1]

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const grad = ctx.createLinearGradient(0, 0, c.width, c.height)
    grad.addColorStop(0, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 2
    ctx.strokeRect(c.width / 2 - 30, c.height / 2 - 40, 60, 80)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.strokeRect(10, 10, c.width - 20, c.height - 20)
  }, [project, c1, c2])

  const time = new Date(project.updatedAt).toLocaleString()

  return (
    <div className="group glass rounded-2xl overflow-hidden transition-all hover:border-[var(--color-accent-3)] hover:translate-y-[-2px]">
      <div
        className="relative aspect-video cursor-pointer bg-[var(--color-panel-2)] flex items-center justify-center"
        onClick={onOpen}
        onDoubleClick={onRename}
      >
        <canvas ref={canvasRef} className="w-full h-full" width={320} height={180} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/30">
          <button className="rounded-full bg-white text-black px-4 py-2 text-xs font-semibold shadow" onClick={onOpen}>
            Open
          </button>
        </div>
        <span className="absolute top-3 left-3 text-[9px] px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/10">
          {project.aspectRatio} · {typeLabel[project.type] || project.type}
        </span>
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <h3 className="font-medium text-sm truncate" title={project.name}>
          {project.name}
        </h3>
        <div className="relative">
          <button
            className="h-7 w-7 rounded-lg text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]"
            title="More actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="px-3 pb-3 text-xs text-[var(--color-text-muted)]">{time}</div>
    </div>
  )
}
