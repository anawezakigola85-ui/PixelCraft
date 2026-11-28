import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { generateImage } from '../lib/ai'
import { useEditor } from '../store/editor'
import { useProjects } from '../store/projectsStore'
import { nextProjectName } from '../lib/projects'
import { navigate } from './Router'

const STYLES = ['Cinematic', 'Realistic', 'Illustration', 'Anime-inspired', '3D', 'Minimalist', 'Abstract', 'Vintage', 'Poster', 'Photography']

const ASPECTS = [
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Widescreen' },
  { value: '9:16', label: '9:16 Portrait' },
]

export default function AIImageGen() {
  const [prompt, setPrompt] = useState('')
  const [negative, setNegative] = useState('')
  const [style, setStyle] = useState('Cinematic')
  const [aspect, setAspect] = useState('1:1')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [addedTo, setAddedTo] = useState<{ name: string; path: string } | null>(null)

  const generate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await generateImage(prompt.trim(), { negativePrompt: negative.trim() || undefined, aspect: aspect as '1:1' | '16:9' | '9:16', style })
      if (res.error) setError(res.error)
      else if (res.url) setImages((imgs) => [res.url, ...imgs.slice(0, 7)])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const addToCanvas = async (url: string) => {
    if (adding) return
    setAdding(true)
    setError('')
    try {
      const store = useProjects.getState()
      let project = store.current
      if (!project) {
        // No project yet: create and open one instead of silently doing nothing.
        project = await useProjects.getState().createProject(
          nextProjectName(store.projects),
          'image',
          aspect as '1:1' | '16:9' | '9:16',
        )
      }

      // The editor store is the live canvas; seed it for this project first.
      const editor = useEditor.getState()
      if (editor.selectedProjectId !== project.id) {
        useEditor.setState({
          selectedProjectId: project.id,
          elements: [...(project.elements || [])],
          clips: [...(project.clips || [])],
        })
      }
      const id = useEditor.getState().addElement({
        type: 'image', name: `AI Image ${useEditor.getState().elements.length + 1}`,
        src: url, x: 100 + (useEditor.getState().elements.length % 5) * 20, y: 100,
        width: 480, height: 480, opacity: 1,
      })
      // Read live editor elements, never a stale project.elements snapshot.
      const elements = [...useEditor.getState().elements]
      if (!elements.some((el) => el.id === id)) throw new Error('Could not add the image to the editor.')

      useProjects.getState().updateCurrent({ elements })
      await useProjects.getState().saveCurrent()
      setAddedTo({ name: project.name, path: `/editor/${project.id}` })
    } catch (e) {
      setError((e as Error).message || 'Could not add the image to the editor.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 glass-strong border-b border-[var(--color-border)] px-8 py-4">
        <div className="mx-auto max-w-4xl flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-[var(--color-text)] text-sm">← Dashboard</button>
          <h1 className="font-display text-2xl font-bold">AI Image Generator</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        <section className="glass-strong rounded-2xl p-6 animate-slide-up">
          <h2 className="font-display text-lg font-semibold">Generate Image</h2>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Prompt</label>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. a cinematic portrait of a woman in golden light"
                className="w-full mt-1.5 h-10"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Negative prompt</label>
              <Input value={negative} onChange={(e) => setNegative(e.target.value)} placeholder="blurry, low quality, text" className="w-full mt-1.5 h-10" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-[var(--color-text-muted)]">Style</label>
              <Select value={style} options={STYLES.map((s) => ({ value: s, label: s }))} onChange={(e) => setStyle(e.target.value)} className="w-44" />
              <label className="text-xs text-[var(--color-text-muted)]">Aspect</label>
              <Select value={aspect} options={ASPECTS} onChange={(e) => setAspect(e.target.value)} className="w-40" />
              <Button onClick={() => void generate()} disabled={loading || !prompt.trim()} className="brand-gradient text-black">
                {loading ? 'Generating…' : 'Generate'}
              </Button>
            </div>
            {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-4">Results</h2>
          {addedTo && (
            <p className="mb-4 rounded-lg glass px-3 py-2 text-xs text-[var(--color-text-muted)]">
              Added to “{addedTo.name}”.{' '}
              <button className="text-[var(--color-accent-2)] underline" onClick={() => navigate(addedTo.path)}>Open in Editor →</button>
            </p>
          )}
          {images.length === 0 && !error && <p className="text-sm text-[var(--color-text-muted)]">Generated images will appear here.</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((url, i) => (
              <div key={i} className="group relative glass rounded-2xl overflow-hidden border border-[var(--color-border)]">
                <img src={url} alt={`generated-${i}`} className="w-full h-44 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 flex gap-2 items-center justify-center transition p-4">
                  <Button size="sm" disabled={adding} onClick={() => void addToCanvas(url)} className="text-black">
                    {adding ? 'Adding…' : addedTo ? 'Add another' : 'Add to Editor'}
                  </Button>
                  <Button variant="secondary" size="sm">
                    <a href={url} download="generated.png">Save</a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
