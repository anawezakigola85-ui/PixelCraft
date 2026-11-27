import { MoreHorizontal } from 'lucide-react'
import type { Project } from '../lib/types'
import DesignPreview from '../components/ui/DesignPreview'

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
  const time = new Date(project.updatedAt).toLocaleString()

  return (
    <div className="group glass rounded-2xl overflow-hidden transition-all hover:border-[var(--color-accent-3)] hover:translate-y-[-2px]">
      <div
        className="relative aspect-video cursor-pointer bg-[#090A0F]"
        onClick={onOpen}
        onDoubleClick={onRename}
        title={`Open "${project.name}"`}
      >
        {/* Real project artwork, not a generic gradient placeholder. */}
        <DesignPreview design={project} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/30">
          <button
            className="rounded-full bg-white text-black px-4 py-2 text-xs font-semibold shadow"
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
          >
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
        <button
          className="h-7 w-7 rounded-lg text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]"
          title="Double-click the preview to rename"
          onClick={onRename}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-3 pb-3 text-xs text-[var(--color-text-muted)]">{time}</div>
    </div>
  )
}
