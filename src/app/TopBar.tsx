import { useCallback } from 'react'
import { Save, Play, Pause, Download, Settings, Sparkles, Maximize2, UserCircle, LogOut } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { navigate } from './Router'
import { useProjects } from '../store/projectsStore'
import { useEditor } from '../store/editor'
import { useUI } from '../store/ui'
import { useAuth } from '../store/authStore'

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
  msRequestFullscreen?: () => Promise<void> | void
}

export default function TopBar() {
  const { current, saveCurrent, exportProject, updateCurrent } = useProjects()
  const { session, logout } = useAuth()
  const playing = useEditor((s) => s.playing)
  const view = useEditor((s) => s.view)
  const aiPanelOpen = useUI((s) => s.aiPanelOpen)
  const setAIPanelOpen = useUI((s) => s.setAIPanelOpen)

  /** Save/export must contain the latest canvas edits, not a stale project copy. */
  const syncEditor = useCallback(() => {
    const store = useProjects.getState()
    if (!store.current || useEditor.getState().selectedProjectId !== store.current.id) return
    const { elements, clips } = useEditor.getState()
    updateCurrent({ elements, clips })
  }, [updateCurrent])

  const handleSave = useCallback(async () => {
    syncEditor()
    await saveCurrent()
  }, [syncEditor, saveCurrent])

  const handleExport = useCallback(() => {
    syncEditor()
    exportProject()
  }, [syncEditor, exportProject])

  const handlePreview = () => {
    if (view === 'video') {
      const state = useEditor.getState()
      const nextPlaying = !state.playing
      state.togglePlay()
      // Studio renders a real <video>; drive it directly so this button is not decorative.
      const video = document.querySelector('video')
      if (video) {
        if (nextPlaying) void video.play().catch(() => {})
        else video.pause()
      }
      window.dispatchEvent(new Event('pixelcraft:toggle-preview'))
    } else {
      // The lightweight CanvasEditor has no video preview; the pro workspace does.
      navigate('/workspace')
    }
  }

  const handleFullscreen = async () => {
    const doc = document as FullscreenDocument
    const fallback = () => window.open(window.location.href, '_blank', 'noopener,noreferrer')
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) await doc.exitFullscreen()
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
        return
      }
      const el = document.documentElement as FullscreenElement
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      else if (el.msRequestFullscreen) await el.msRequestFullscreen()
      else fallback()
    } catch {
      fallback()
    }
  }

  return (
    <header className="flex items-center gap-3 px-5 py-2.5 glass border-b border-[var(--color-border)] backdrop-blur-md">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          className="flex items-center gap-2.5 font-display text-2xl font-bold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent-2)]"
          onClick={() => navigate('/')}
          title="Back to dashboard"
        >
          <Logo size={34} className="shrink-0" />
          Pixelcraft
        </button>
        {current && (
          <h2 className="font-medium text-sm truncate text-[var(--color-text)]" title={current.name}>
            {current.name}
          </h2>
        )}
        <Button variant="secondary" size="sm" onClick={() => navigate('/templates')}>
          Templates
        </Button>
        <Button variant="secondary" size="sm" onClick={() => navigate('/workspace')} title="Open the pro video workspace">
          <Maximize2 className="h-3.5 w-3.5" />
          Pro Workspace
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => useEditor.getState().setSelectedElementId(undefined)} aria-label="Close selection">
          Close
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePreview}
          title={view === 'video' ? 'Play or pause the studio preview' : 'Open the full preview in Pro Workspace'}
          aria-label={view === 'video' ? (playing ? 'Pause preview' : 'Play preview') : 'Open pro preview'}
        >
          {view === 'video' && playing ? <Pause className="h-3.5 w-3.5" /> : view === 'video' ? <Play className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {view === 'video' ? (playing ? 'Pause' : 'Play') : 'Pro Preview'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void handleSave()}>
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={!current}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button variant="secondary" size="sm" onClick={() => navigate('/settings')} title="Settings" aria-label="Settings">
          <Settings className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAIPanelOpen(!aiPanelOpen)}
          aria-label="Toggle AI assistant"
          aria-pressed={aiPanelOpen}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assistant
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="hidden lg:inline-flex"
          onClick={() => void handleFullscreen()}
          title="Toggle fullscreen"
          aria-label="Toggle fullscreen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        {/* Profile chip (when logged in) */}
        {session && (
          <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-3 ml-1">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-3)] flex items-center justify-center text-black font-semibold text-[10px]">
              {(session.name || session.email).slice(0, 2).toUpperCase()}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[8rem]">{session.name}</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/account')} title="Account" aria-label="Account">
              <UserCircle className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} title="Sign out" aria-label="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
