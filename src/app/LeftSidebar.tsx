import { useState } from 'react'
import { Monitor, Text, Upload, Sparkles, Video, Paintbrush, Layers } from 'lucide-react'
import { cn } from '../lib/utils'
import { useUI } from '../store/ui'
import { storeMediaFile } from '../store/projectsStore'
import { navigate } from './Router'

const PANELS = ['templates', 'media', 'text', 'elements', 'ai'] as const

const labels: Record<string, { label: string; color: string; hint: string }> = {
  templates: { label: 'Templates', color: '#f59e0b', hint: 'Browse the library in Phase 4' },
  media: { label: 'Media', color: '#a371f7', hint: 'Upload video/image/audio files' },
  text: { label: 'Text', color: '#22d3ee', hint: 'Add text to the canvas' },
  elements: { label: 'Elements', color: '#8b5cf6', hint: 'Shapes, lines, stickers' },
  ai: { label: 'AI Tools', color: '#ec4899', hint: 'Pixel AI Assistant' },
}

export default function LeftSidebar() {
  const [active, setActive] = useState<(typeof PANELS)[number]>('templates')
  const leftPanelOpen = useUI((s) => s.leftPanelOpen)

  if (!leftPanelOpen) return null

  return (
    <aside className="flex w-56 shrink-0 flex-col glass-strong border-r border-[var(--color-border)] animate-slide-in">
      <div className="flex flex-col gap-1 p-3">
        {PANELS.map((key) => {
          const meta = labels[key]
          return (
            <button
              key={key}
              className={cn(
                'h-9 flex items-center gap-2.5 rounded-lg px-3 text-sm text-[var(--color-text)] transition',
                active === key ? 'bg-white/10 font-medium' : 'hover:bg-white/5',
              )}
              onClick={() => setActive(key)}
            >
              <span className="text-[var(--color-text-muted)]">
                {key === 'templates' ? <Paintbrush className="h-4 w-4" /> : key === 'media' ? <Video className="h-4 w-4" /> : key === 'text' ? <Text className="h-4 w-4" /> : key === 'elements' ? <Layers className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-[var(--color-accent-2)]" />}
              </span>
              {meta.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 px-3 pb-3 border-t border-[var(--color-border)] space-y-3 overflow-y-auto">
        {active === 'templates' && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Templates</h3>
            <button
              className="w-full h-36 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center justify-center bg-[var(--color-panel)] hover:border-[var(--color-accent-3)]"
              onClick={() => navigate('/templates')}
            >
              <Monitor className="h-8 w-8 mb-2" />
              <span className="text-xs">Browse templates</span>
            </button>
            <p className="text-[10px] text-[var(--color-text-muted)]">Template library (Phase 4) — 30+ editable designs.</p>
          </div>
        )}
        {active === 'media' && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Media</h3>
            <button
              className="w-full h-36 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center justify-center bg-[var(--color-panel)] hover:border-[var(--color-accent-3)]"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'video/*,image/*,audio/*'
                input.onchange = () => {
                  const f = input.files?.[0]
                  if (f) void storeMediaFile(f)
                }
                input.click()
              }}
            >
              <Upload className="h-8 w-8 mb-2" />
              <span className="text-xs">Upload media</span>
            </button>
          </div>
        )}
        {active === 'ai' && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">AI Tools</h3>
            <button className="w-full h-36 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-accent-3)]" onClick={() => navigate('/ai')}>
              <Sparkles className="h-8 w-8 mb-2 text-[var(--color-accent-2)]" />
              <span className="text-xs">AI Assistant</span>
            </button>
            <button className="w-full text-xs rounded px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]" onClick={() => navigate('/ai')}>
              AI Image Generator ↗
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
