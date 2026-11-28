import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, Sparkles, Monitor, LayoutGrid, Wand2,
  Home, Film, Layers, Image as ImageIcon, Megaphone,
  Clapperboard, Gauge, Mic, Eraser, Video,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import LogoBackdrop from '../components/ui/LogoBackdrop'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { navigate } from './Router'
import { useProjects } from '../store/projectsStore'
import { useUI } from '../store/ui'
import { useAuth } from '../store/authStore'
import { ProjectCard } from './ProjectCard'
import DesignPreview from '../components/ui/DesignPreview'
import { TEMPLATES } from '../data/templates'
import { applyTemplate } from '../lib/templates'
import { getAllMedia, nextProjectName } from '../lib/projects'
import type { Project } from '../lib/types'

const NAV: Array<{ label: string; icon: typeof Home; path: string }> = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Templates', icon: LayoutGrid, path: '/templates' },
  { label: 'Create with AI', icon: Sparkles, path: '/ai' },
  { label: 'Video Studio', icon: Film, path: '/workspace' },
  { label: 'Design Studio', icon: Monitor, path: '/workspace' },
  { label: 'More tools', icon: Layers, path: '/tools' },
]

/** Labels describe the real page each card opens — no imaginary AI products. */
const AI_CARDS: Array<{
  title: string
  desc: string
  icon: typeof Sparkles
  path: string
  color: string
}> = [
  { title: 'Video Tools', desc: 'Trim, convert and enhance real clips', icon: Video, path: '/tools?tab=video', color: '#8b5cf6' },
  { title: 'AI Image', desc: 'Generate an image from a text prompt', icon: ImageIcon, path: '/ai', color: '#22d3ee' },
  { title: 'Ad Templates', desc: 'Browse ready-made business designs', icon: Megaphone, path: '/templates?category=Business', color: '#f59e0b' },
  { title: 'Background Remover', desc: 'Key out a solid colour from video', icon: Eraser, path: '/tools?tab=video', color: '#ec4899' },
  { title: 'Pro Studio', desc: 'Edit layers and clips on a timeline', icon: Clapperboard, path: '/workspace', color: '#a371f7' },
  { title: 'Auto Captions', desc: 'Turn a script into timed captions', icon: Film, path: '/tools?tab=audio', color: '#14b8a6' },
  { title: 'Enhance Video', desc: 'Adjust brightness, contrast and sharpness', icon: Gauge, path: '/tools?tab=video', color: '#3b82f6' },
  { title: 'Text to Speech', desc: 'Hear your script in a chosen voice', icon: Mic, path: '/tools?tab=audio', color: '#f97316' },
  { title: 'Image Tools', desc: 'Resize, combine and retouch photos', icon: Layers, path: '/tools?tab=image', color: '#ef4444' },
]

export default function Dashboard() {
  const { projects, createProject, renameProjectById, loadProjects } = useProjects()
  const { searchQuery, setSearchQuery } = useUI()
  const { session } = useAuth()
  const greetingName = session?.name || session?.email || ''
  const [creating, setCreating] = useState(false)
  const [mediaCount, setMediaCount] = useState(0)

  useEffect(() => {
    void loadProjects()
    void getAllMedia(session?.userId).then((m) => setMediaCount(m.length))
  }, [loadProjects, session?.userId])

  const query = searchQuery.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!query) return projects
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query) ||
        p.elements.some((e) => e.text?.toLowerCase().includes(query)),
    )
  }, [projects, query])

  const filteredTemplates = useMemo(() => {
    if (!query) return TEMPLATES.slice(0, 3)
    return TEMPLATES.filter((tp) =>
      [tp.name, tp.description, tp.category, tp.style, tp.aspectRatio,
        ...(tp.layoutPreview?.textLines || []),
        ...tp.elements.map((e) => e.text || '')]
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [query])

  const recent = useMemo(() => [...filtered].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4), [filtered])
  const saved = useMemo(() => [...filtered].sort((a, b) => a.updatedAt - b.updatedAt).slice(4, 16), [filtered])

  // One click: auto-name the project and jump straight into Pro Studio.
  const handleQuickCreate = async () => {
    if (creating) return
    setCreating(true)
    try {
      await createProject(nextProjectName(projects), 'video', '9:16')
      navigate('/workspace')
    } catch {
      window.alert('Could not create the project. Please try again.')
      setCreating(false)
    }
  }

  const handleOpen = (id: string) => {
    void useProjects.getState().openProject(id).then(() => navigate(`/editor/${id}`))
  }
  const handleRename = (project: Project) => {
    const next = window.prompt('Rename project:', project.name)
    if (next && next.trim() && next.trim() !== project.name) {
      void renameProjectById(project.id, next.trim()).catch(() => {
        window.alert('Could not rename the project. Please try again.')
      })
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <LogoBackdrop />
      {/* Hero header */}
      <header className="sticky top-0 z-20 glass-strong border-b border-[var(--color-border)] px-8 py-4">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 font-display text-2xl font-bold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent-2)]">
            <Logo size={36} className="shrink-0" />
            Pixelcraft
          </button>
          <nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-none md:w-auto">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] transition hover:bg-white/10 hover:text-[var(--color-text)]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="relative ml-auto w-full max-w-xs">
            <Input
              placeholder="Search templates or projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefixIcon={<Search className="h-4 w-4" />}
              className="w-full"
            />
          </div>
          {greetingName && (
            <span className="hidden max-w-32 truncate rounded-full bg-white/5 px-3 py-1.5 text-xs text-[var(--color-text-muted)] lg:inline">
              {greetingName}
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-8 py-8 space-y-12">
        {/* Hero banner */}
        <section className="hero-glow relative overflow-hidden rounded-3xl glass-strong p-8 lg:p-12 animate-slide-up">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--color-accent-2)]/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-32 h-40 w-40 rounded-full bg-[var(--color-accent-1)]/20 blur-3xl" />
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-[var(--color-accent-2)]">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered creative suite
            </span>
            <h1 className="font-display text-5xl font-bold tracking-tight lg:text-6xl">
              Create with <span className="text-[var(--color-accent-2)]">AI</span>
            </h1>
            <p className="text-lg text-[var(--color-text-muted)]">
              Turn ideas into motion and imagery in the easiest way — design, edit and animate in one place.
            </p>
            {greetingName && (
              <div className="glass inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs text-[var(--color-text-muted)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-success)]" />
                Signed in as {greetingName}
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={() => void handleQuickCreate()}
                disabled={creating}
                className="brand-gradient text-black h-11 px-6"
              >
                <Plus className="h-4 w-4" />
                {creating ? 'Opening Studio…' : 'Create project'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/ai')}>
                <Sparkles className="h-4 w-4" />
                Ask AI
              </Button>
              <Button variant="outline" onClick={() => navigate('/tools')}>
                <Wand2 className="h-4 w-4" />
                More tools
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 pt-2 text-xs text-[var(--color-text-muted)]">
              <span className="glass rounded px-2 py-1">{mediaCount} media items stored</span>
              <span className="glass rounded px-2 py-1">{projects.length} projects</span>
            </div>
          </div>
        </section>

        {/* AI feature grid */}
        <section className="animate-slide-up" style={{ animationDelay: '0.03s' }}>
          <div className="mb-4">
            <h2 className="font-display text-2xl font-semibold">Create with AI</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Pick a tool — each one opens a real, working part of PixelCraft.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {AI_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <button
                  key={card.title}
                  onClick={() => navigate(card.path)}
                  className="group glass rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-accent-3)]"
                >
                  <span
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${card.color}22`, color: card.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">{card.desc}</p>
                  <span className="mt-3 inline-block text-[10px] text-[var(--color-accent-2)] opacity-0 transition group-hover:opacity-100">Open →</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Quick links */}
        <section className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/templates')}>
            Template Library
          </Button>
          <Button variant="secondary" onClick={() => navigate('/tools')}>
            CapCut-style Tools
          </Button>
          <Button variant="secondary" onClick={() => navigate('/ai')}>
            AI Image Generator
          </Button>
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            Settings
          </Button>
        </section>

        {/* Start from a real template */}
        <section className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">Start from a template</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {query
                  ? `${filteredTemplates.length} template${filteredTemplates.length === 1 ? '' : 's'} matching “${searchQuery.trim()}”.`
                  : 'Click any design to open a fully editable copy.'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/templates')}>
              View all {TEMPLATES.length} →
            </Button>
          </div>
          {filteredTemplates.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No templates match that search. Try a different word.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredTemplates.map((tp) => (
                <button
                  key={tp.id}
                  onClick={() => void applyTemplate(tp)}
                  className="group glass rounded-2xl overflow-hidden text-left hover:border-[var(--color-accent-3)] hover:translate-y-[-2px] transition-all"
                >
                  <div className="relative h-40 bg-[#090A0F]">
                    <DesignPreview design={tp} className="absolute inset-0 h-full w-full" />
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-3 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition">
                      Use →
                    </span>
                  </div>
                  <div className="p-3 border-t border-[var(--color-border)]">
                    <p className="text-sm font-medium truncate">{tp.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{tp.style} · {tp.aspectRatio}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent Projects */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-semibold">Recent Projects</h2>
            <button className="text-sm text-[var(--color-accent-2)]" onClick={() => navigate('/templates')}>Browse templates ↩</button>
          </div>
          {recent.length === 0 && (
            <p className="text-[var(--color-text-muted)] text-sm">
              {query ? 'No projects match that search.' : 'You have no projects yet. Create your first project!'}
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {recent.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => handleOpen(p.id)}
                onRename={() => handleRename(p)}
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
                  onRename={() => handleRename(p)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
