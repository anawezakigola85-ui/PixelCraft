import { useState } from 'react'
import {
  Video, Type, Sticker, Layers, Film,
  SlidersHorizontal, Palette, Bold, LetterText, PersonStanding, FolderOpen, Music2, PlayCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useEditor } from '../../store/editor'
import { useProjects } from '../../store/projectsStore'
import { v4 } from '../../store/ids'

type Panel = 'media' | 'audio' | 'text' | 'elements' | 'transitions' | 'filters' | 'brand' | 'stock'

export default function AssetRail() {
  const [active, setActive] = useState<Panel>('media')
  const ed = useEditor()
  const { current: project } = useProjects()

  const addClipToTimeline = (card: { name: string; kind: string; url?: string }) => {
    const trackId = project?.tracks.find((t) => t.type === 'video')?.id || project?.tracks[0]?.id || 'track-v'
    ed.addClip({ trackId, start: 5, duration: 2, name: card.name, src: card.url })
    alert(`Added "${card.name}" to the ${trackId} timeline track.`)
  }

  const addTextElement = () => {
    const el = { type: 'text', text: 'Title here', x: 100, y: 100, width: 800, height: 120, fontSize: 64, color: '#f3f5ff', name: 'Title', z: v4() }
    const id = ed.addElement(el as never)
    if (project) void useProjects.getState().updateCurrent({ elements: [...project.elements, ed.elements.find((e) => e.id === id) as never] })
    alert('Text element added to canvas + Overlay track.')
  }

  const panels: Array<{ id: Panel; label: string; icon: React.ReactElement }> = [
    { id: 'media', label: 'Media', icon: <Video className="h-4 w-4" /> },
    { id: 'stock', label: 'Stock', icon: <Film className="h-4 w-4" /> },
    { id: 'audio', label: 'Audio', icon: <Music2 className="h-4 w-4" /> },
    { id: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
    { id: 'elements', label: 'Elements', icon: <Sticker className="h-4 w-4" /> },
    { id: 'transitions', label: 'Transitions', icon: <PlayCircle className="h-4 w-4" /> },
    { id: 'filters', label: 'Filters', icon: <Palette className="h-4 w-4" /> },
    { id: 'brand', label: 'Brand', icon: <Layers className="h-4 w-4" /> },
  ]

  const sampleCards = [
    { id: 's1', name: 'B-Roll', kind: 'video', url: 'blob:video-1' },
    { id: 's2', name: 'Wedding', kind: 'video', url: 'blob:video-2' },
    { id: 's3', name: 'Relaxing Beat', kind: 'music', url: 'blob:audio-1' },
    { id: 's4', name: 'Main Theme', kind: 'music', url: 'blob:audio-2' },
    { id: 's5', name: 'Opening', kind: 'opening', url: 'blob:text-1' },
  ]

  return (
    <aside className="w-64 shrink-0 glass-strong border-l border-[var(--color-border)] animate-slide-in overflow-y-auto">
      <div className="p-3 space-y-1 border-b border-[var(--color-border)]">
        {panels.map((p) => (
          <button
            key={p.id}
            className={active === p.id ? 'glass text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:bg-white/5'}
            onClick={() => setActive(p.id)}
          >
            <div className="flex items-center gap-2 p-2 rounded-lg">
              {p.icon}
              <span className="text-xs font-medium">{p.label}</span>
            </div>
          </button>
        ))}
        <button className="w-full text-[10px] text-[var(--color-text-muted)] mt-2">Library + uploads ↗</button>
      </div>

      <div className="p-4 space-y-4 animate-fade-in">
        {active === 'media' && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm">Media Library</h3>
            {sampleCards.map((c) => (
              <button
                key={c.id}
                className="w-full glass rounded-xl px-3 py-4 flex items-center gap-3 hover:border-[var(--color-accent-3)] transition"
                onClick={() => addClipToTimeline(c)}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-3)] flex items-center justify-center text-black font-bold text-xs shrink-0">🎬</div>
                <span className="text-sm text-[var(--color-text)] truncate flex-1 text-left">{c.name}</span>
              </button>
            ))}
          </div>
        )}
        {active === 'stock' && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm">Stock Videos</h3>
            {sampleCards.filter((m) => m.kind === 'video').map((c) => (
              <Button key={c.id} variant="outline" size="sm" className="w-full justify-start glass" onClick={() => addClipToTimeline(c)}>
                {c.name}
              </Button>
            ))}
          </div>
        )}
        {active === 'audio' && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm">Audio</h3>
            {sampleCards.filter((m) => ['audio', 'music', 'voiceover'].includes(m.kind)).map((c) => (
              <Button key={c.id} variant="outline" size="sm" className="w-full justify-start glass" onClick={() => addClipToTimeline(c)}>
                {c.name}
              </Button>
            ))}
          </div>
        )}
        {active === 'text' && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm">Text Templates</h3>
            <Button size="sm" className="w-full justify-start glass bg-[var(--color-accent)] text-black" onClick={addTextElement}><LetterText className="h-4 w-4" /> Title (Center)</Button>
            <Button size="sm" className="w-full justify-start glass bg-[var(--color-accent)] text-black" onClick={addTextElement}><Bold className="h-4 w-4" /> Heading</Button>
            <Button size="sm" className="w-full justify-start glass bg-[var(--color-accent)] text-black" onClick={addTextElement}><Type className="h-4 w-4" /> Lower Third</Button>
          </div>
        )}
        {active === 'elements' && (
          <div className="grid grid-cols-2 gap-2">
            {['Shape', 'Star', 'Globe', 'Bulb', 'Hammer'].map((n) => (
              <Button key={n} variant="outline" size="sm" onClick={() => ed.addElement({ type: 'shape', name: n, fill: '#a371f7', x: 10, y: 10, width: 40, height: 40 } as never)}>
                {n}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={addTextElement}><Layers className="h-4 w-4" /> Text</Button>
          </div>
        )}
        {active === 'transitions' && (
          <div className="space-y-2">
            {['Fade', 'Slide', 'Zoom', 'Swipe'].map((n) => (
              <Button key={n} variant="outline" size="sm" className="w-full justify-start glass"><span className="text-base">→</span> {n}</Button>
            ))}
          </div>
        )}
        {active === 'filters' && (
          <div className="grid grid-cols-2 gap-2">
            {['Vintage', 'Cinematic', 'Lenses', 'Neon', 'Glitch', 'Fade'].map((n) => (
              <Button key={n} variant="outline" size="sm"><span className="w-2 h-2 rounded bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-3)]"></span>{n}</Button>
            ))}
          </div>
        )}
        {active === 'brand' && (
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full"><PersonStanding className="h-4 w-4" /> Brand Kit</Button>
            <Button variant="outline" size="sm" className="w-full"><FolderOpen className="h-4 w-4" /> Music Library</Button>
            <Button variant="outline" size="sm" className="w-full"><SlidersHorizontal className="h-4 w-4" /> Audio Processor</Button>
          </div>
        )}
      </div>
    </aside>
  )
}
