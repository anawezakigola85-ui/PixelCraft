import { useState } from 'react'
import { Monitor, Text, Upload, Sparkles, Video, Paintbrush, Layers } from 'lucide-react'
import { cn } from '../lib/utils'
import { useUI } from '../store/ui'
import { useEditor } from '../store/editor'
import { useProjects } from '../store/projectsStore'
import { fileToDataURL } from '../lib/projects'
import { storeMediaFile } from '../store/projectsStore'
import type { ProjectElement } from '../lib/types'
import { navigate } from './Router'

const PANELS = ['templates', 'media', 'text', 'elements', 'ai'] as const

const labels: Record<string, { label: string; color: string; hint: string }> = {
  templates: { label: 'Templates', color: '#f59e0b', hint: 'Browse the editable template library' },
  media: { label: 'Media', color: '#a371f7', hint: 'Upload video/image/audio files' },
  text: { label: 'Text', color: '#22d3ee', hint: 'Add text to the canvas' },
  elements: { label: 'Elements', color: '#8b5cf6', hint: 'Shapes, lines, stickers' },
  ai: { label: 'AI Tools', color: '#ec4899', hint: 'Pixel AI Assistant' },
}

const TEXT_PRESETS = [
  { label: 'Heading', text: 'Your heading', fontSize: 64, weight: 800, y: 0.3 },
  { label: 'Subtitle', text: 'Add a subtitle', fontSize: 40, weight: 600, y: 0.45 },
  { label: 'Body text', text: 'Start writing your story here.', fontSize: 24, weight: 400, y: 0.58 },
] as const

const SHAPE_PRESETS = [
  { label: 'Rectangle', shape: 'rect', fill: '#6366f1' },
  { label: 'Circle', shape: 'circle', fill: '#22d3ee' },
  { label: 'Line', shape: 'line', fill: '#f59e0b' },
] as const

export default function LeftSidebar() {
  const [active, setActive] = useState<(typeof PANELS)[number]>('templates')
  const [status, setStatus] = useState<string | null>(null)
  const leftPanelOpen = useUI((s) => s.leftPanelOpen)
  const current = useProjects((s) => s.current)
  const updateCurrent = useProjects((s) => s.updateCurrent)

  const sync = () => {
    const project = useProjects.getState().current
    if (!project || useEditor.getState().selectedProjectId !== project.id) return
    updateCurrent({ elements: useEditor.getState().elements })
  }

  const insert = (element: Omit<Partial<ProjectElement>, 'id'>, message: string) => {
    const id = useEditor.getState().addElement(element)
    useEditor.getState().setSelectedElementId(id)
    sync()
    setStatus(`${message} added to canvas`)
  }

  const addText = (preset: (typeof TEXT_PRESETS)[number]) => {
    const width = current?.canvasWidth ?? 1280
    const height = current?.canvasHeight ?? 720
    insert(
      {
        type: 'text',
        name: preset.label,
        text: preset.text,
        fontSize: preset.fontSize,
        fontWeight: preset.weight,
        fontFamily: "'Inter', sans-serif",
        color: '#ffffff',
        x: Math.round(width * 0.1),
        y: Math.round(height * preset.y),
        width: Math.round(width * 0.8),
        height: Math.round(preset.fontSize * 1.8),
      },
      preset.label,
    )
  }

  const addShape = (preset: (typeof SHAPE_PRESETS)[number]) => {
    const width = current?.canvasWidth ?? 1280
    const height = current?.canvasHeight ?? 720
    const size = Math.round(Math.min(width, height) * 0.25)
    insert(
      {
        type: 'shape',
        name: preset.label,
        params: { shape: preset.shape },
        x: Math.round((width - size) / 2),
        y: Math.round((height - size) / 2),
        width: size,
        height: preset.shape === 'line' ? 4 : size,
        fill: preset.fill,
        cornerRadius: preset.shape === 'rect' ? 12 : 0,
        points: preset.shape === 'line' ? [[0, 0], [size, 0]] : undefined,
      },
      preset.label,
    )
  }

  const handleUpload = async (file: File) => {
    try {
      const mediaId = await storeMediaFile(file)
      if (file.type.startsWith('image/')) {
        const src = await fileToDataURL(file)
        const width = Math.min(400, current?.canvasWidth ?? 1280)
        insert(
          {
            type: 'image',
            name: file.name,
            src,
            mediaId,
            x: 40,
            y: 40,
            width,
            height: Math.round(width * 0.6),
            opacity: 1,
          },
          'Image',
        )
      } else {
        setStatus(`${file.name} saved to media library`)
      }
    } catch {
      setStatus('Upload failed — please try another file')
    }
  }

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
              className="w-full h-36 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] flex flex-col items-center justify-center bg-[var(--color-panel)] hover:border-[var(--color-accent-3)]"
              onClick={() => navigate('/templates')}
            >
              <Monitor className="h-8 w-8 mb-2" />
              <span className="text-xs">Browse templates</span>
            </button>
            <p className="text-[10px] text-[var(--color-text-muted)]">132 real editable designs, including TikTok, Canva and CapCut packs.</p>
          </div>
        )}

        {active === 'media' && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Media</h3>
            <button
              className="w-full h-36 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] flex flex-col items-center justify-center bg-[var(--color-panel)] hover:border-[var(--color-accent-3)]"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'video/*,image/*,audio/*'
                input.onchange = () => {
                  const file = input.files?.[0]
                  if (file) void handleUpload(file)
                }
                input.click()
              }}
            >
              <Upload className="h-8 w-8 mb-2" />
              <span className="text-xs">Upload media</span>
            </button>
            <p className="text-[10px] text-[var(--color-text-muted)]">Images are also placed on the canvas; video and audio go to the media library.</p>
          </div>
        )}

        {active === 'text' && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Add text</h3>
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-left text-xs text-[var(--color-text)] hover:border-[var(--color-accent-3)] hover:bg-white/5"
                onClick={() => addText(preset)}
              >
                <span className="font-semibold">{preset.label}</span>
                <span className="block text-[10px] text-[var(--color-text-muted)]">{preset.text} · {preset.fontSize}px</span>
              </button>
            ))}
          </div>
        )}

        {active === 'elements' && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Shapes</h3>
            {SHAPE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="w-full flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-text)] hover:border-[var(--color-accent-3)] hover:bg-white/5"
                onClick={() => addShape(preset)}
              >
                <span className="h-4 w-4 shrink-0" style={{ background: preset.fill, borderRadius: preset.shape === 'circle' ? '9999px' : preset.shape === 'line' ? 0 : 4 }} />
                {preset.label}
              </button>
            ))}
            <p className="text-[10px] text-[var(--color-text-muted)]">New shapes are selectable, draggable and editable in Properties.</p>
          </div>
        )}

        {active === 'ai' && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">AI Tools</h3>
            <button className="w-full h-36 rounded-lg border border-[var(--color-border)] flex flex-col items-center justify-center hover:border-[var(--color-accent-3)]" onClick={() => navigate('/ai')}>
              <Sparkles className="h-8 w-8 mb-2 text-[var(--color-accent-2)]" />
              <span className="text-xs">AI Assistant</span>
            </button>
            <button className="w-full text-xs rounded px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]" onClick={() => navigate('/ai')}>
              AI Image Generator ↗
            </button>
            <button className="w-full text-xs rounded px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]" onClick={() => navigate('/tools')}>
              All Tools (trim, resize, captions…) ↗
            </button>
          </div>
        )}

        {status && <p className="text-[10px] text-[var(--color-accent-2)]" role="status">{status}</p>}
      </div>
    </aside>
  )
}
