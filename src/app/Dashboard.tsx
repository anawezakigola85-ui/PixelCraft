import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Sparkles, Monitor, LayoutGrid, Download } from 'lucide-react'
import Logo from '../components/ui/Logo'
import LogoBackdrop from '../components/ui/LogoBackdrop'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Dialog, DialogFooter } from '../components/ui/Dialog'
import { navigate } from './Router'
import { useProjects } from '../store/projectsStore'
import { useUI } from '../store/ui'
import { useAuth } from '../store/authStore'
import { ProjectCard } from './ProjectCard'
import { getAllMedia } from '../lib/projects'
import type { Project, ProjectType, AspectRatio } from '../lib/types'

const NEW_PROJECT_OPTIONS: Array<{ type: ProjectType; label: string; icon: typeof Monitor }> = [
  { type: 'image', label: 'Image Design', icon: Monitor },
  { type: 'video', label: 'Video Editing', icon: Sparkles },
  { type: 'graphics', label: 'Graphic Design Studio', icon: LayoutGrid },
  { type: 'social', label: 'Social Media Templates', icon: Monitor },
]

const ASPECT_OPTIONS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5']

export default function Dashboard() {
  const { projects, current, createProject, renameProject, importProject, loadProjects } = useProjects()
  const { searchQuery, setSearchQuery } = useUI()
  const { session } = useAuth()
  const greetingName = session?.name || session?.email || ''
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('image')
  const [aspect, setAspect] = useState<AspectRatio>('16:9')
  const [mediaCount, setMediaCount] = useState(0)

  useEffect(() => {
    void loadProjects()
    void getAllMedia(session?.userId).then((m) => setMediaCount(m.length))
  }, [loadProjects, session?.userId])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.elements.some((e) => e.text?.toLowerCase().includes(q)),
    )
  }, [projects, searchQuery])

  const recent = useMemo(() => [...filtered].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4), [filtered])
  const saved = useMemo(() => [...filtered].sort((a, b) => a.updatedAt - b.updatedAt).slice(4, 16), [filtered])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const project = await createProject(name.trim() || 'Untitled', type, aspect)
    setOpen(false)
    setName('')
    navigate(`/editor/${project.id}`)
  }

  const handleOpen = (id: string) => {
    void useProjects.getState().openProject(id).then(() => navigate(`/editor/${id}`))
  }
  const handleRename = async (project: Project) => {
    const next = window.prompt('Rename project:', project.name)
    if (next && next !== project.name) {
      await renameProject(next)
      if (current?.id === project.id) {
        const updated = useProjects.getState().current
        if (updated) navigate(`/editor/${updated.id}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <LogoBackdrop />
      {/* Hero header */}
      <header className="sticky top-0 z-20 glass-strong border-b border-[var(--color-border)] px-8 pt-6 pb-4">
        <div className="mx-auto max-w-7xl flex items-center gap-5">
          <button className="flex items-center gap-2.5 font-display text-2xl font-bold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent-2)]">
            <Logo size={38} className="shrink-0" />
            Pixelcraft
          </button>
          <div className="relative ml-auto w-full max-w-sm">
            <Input
              placeholder="Search templates or projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefixIcon={<Search className="h-4 w-4" />}
              className="w-full"
            />
          </div>
          <Button variant="outline" className="h-10" onClick={() => navigate('/workspace')} title="Open the pro video & image editor studio">
            <Monitor className="h-4 w-4" />
            Pro Studio
          </Button>
          <Button className="h-10 brand-gradient text-black" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-8 py-8 space-y-12">
        {/* Hero banner */}
        <section className="hero-glow rounded-3xl glass-strong p-8 lg:p-12 animate-slide-up">
          <div className="max-w-xl space-y-4">
            <h1 className="font-display text-4xl font-bold tracking-tight">
              {greetingName ? `Welcome back, ${greetingName}` : 'Create'} <span className="text-[var(--color-accent-2)]">anything</span>, faster.
            </h1>
            <p className="text-[var(--color-text-muted)] text-lg">
              {greetingName ? `${projects.length} projects — design, edit and animate images & videos in one place.` : 'Design, edit and animate — image, video, graphics, all in one place.'}
            </p>
            {greetingName && (
              <div className="glass rounded-lg inline-flex items-center gap-2 px-3 py-1 text-xs text-[var(--color-text-muted)] mt-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                Signed in
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={() => setOpen(true)} className="brand-gradient text-black h-11 px-6">
                <Plus className="h-4 w-4" />
                Start Creating
              </Button>
              <Button variant="outline" onClick={() => navigate('/templates')}>
                Browse Templates
              </Button>
              <Button variant="outline" onClick={() => navigate('/ai')}>
                <Sparkles className="h-4 w-4" />
                AI Image
              </Button>
            </div>
          </div>
          <div className="mt-6 flex gap-3 text-xs text-[var(--color-text-muted)] items-center">
            <span className="glass rounded px-2 py-1">{mediaCount} media items stored</span>
          </div>
        </section>

        {/* Quick links */}
        <section className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/templates')}>
            Template Library
          </Button>
          <Button variant="secondary" onClick={() => navigate('/ai')}>
            AI Image Generator
          </Button>
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            Settings
          </Button>
          <Button
            variant="secondary"
            onClick={() => void importProject()}
            className="ml-auto"
          >
            <Download className="h-4 w-4" />
            Import Project
          </Button>
        </section>

        {/* Recent Projects */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-semibold">Recent Projects</h2>
            <button className="text-sm text-[var(--color-accent-2)]">Browse all ↩</button>
          </div>
          {recent.length === 0 && (
            <p className="text-[var(--color-text-muted)] text-sm">
              You have no projects yet. Create your first project!
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {recent.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => handleOpen(p.id)}
                onRename={() => void handleRename(p)}
              />
            ))}
          </div>
        </section>

        {/* All projects */}
        {saved.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="font-display text-2xl font-semibold mb-4">All Projects</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {saved.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={() => handleOpen(p.id)}
                  onRename={() => void handleRename(p)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* New Project dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title="New Project" description="Create a new design project">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-[var(--color-text-muted)] flex flex-col gap-1">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
                className="h-9 rounded-lg bg-[var(--color-panel)] border border-[var(--color-border)] px-2"
              >
                {NEW_PROJECT_OPTIONS.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[var(--color-text-muted)] flex flex-col gap-1">
              Aspect
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as AspectRatio)}
                className="h-9 rounded-lg bg-[var(--color-panel)] border border-[var(--color-border)] px-2"
              >
                {ASPECT_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
