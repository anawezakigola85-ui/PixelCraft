import { Save, Play, Pause, Download, Settings, Sparkles, Maximize2, UserCircle, LogOut } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { navigate } from './Router'
import { useProjects } from '../store/projectsStore'
import { useEditor } from '../store/editor'
import { useUI } from '../store/ui'
import { useAuth } from '../store/authStore'

export default function TopBar() {
  const { current, saveCurrent, exportProject } = useProjects()
  const { session, logout } = useAuth()

  const handlePreview = () => {
    const s = useEditor.getState()
    if (s.view === 'video') window.dispatchEvent(new Event('pixelcraft:toggle-preview'))
  }

  return (
    <header className="flex items-center gap-3 px-5 py-2.5 glass border-b border-[var(--color-border)] backdrop-blur-md">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          className="flex items-center gap-2.5 font-display text-2xl font-bold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent-2)]"
          onClick={() => navigate('/')}
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
        <Button variant="secondary" size="sm" onClick={() => navigate('/workspace')} title="Open pro editor studio">
          <Maximize2 className="h-3.5 w-3.5" />
          Studio
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => useEditor.getState().setSelectedElementId(undefined)} aria-label="Close selection">
          Close
        </Button>
        <Button variant="secondary" size="sm" onClick={handlePreview}>
          {useEditor.getState().playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          Preview
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void saveCurrent()}>
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void exportProject()} disabled={!current}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button variant="secondary" size="sm" onClick={() => navigate('/settings')}>
          <Settings className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => useUI.getState().setAIPanelOpen(!useUI.getState().aiPanelOpen)} aria-label="Toggle AI assistant">
          <Sparkles className="h-3.5 w-3.5" />
          AI Assistant
        </Button>
        <Button variant="secondary" size="sm" className="hidden lg:inline-flex">
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
