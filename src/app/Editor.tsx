import { useEffect } from 'react'
import { useRouteParam, navigate } from './Router'
import { useProjects } from '../store/projectsStore'
import { useEditor } from '../store/editor'
import TopBar from './TopBar'
import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'
import CanvasEditor from '../components/ImageEditor/CanvasEditor'
import Studio from '../components/VideoEditor/Studio'
import AIAssistant from '../components/AIAssistant/AIAssistant'
import { useUI } from '../store/ui'

export default function Editor() {
  const id = useRouteParam('editor')
  const { current, loadCurrent, saveCurrent } = useProjects()
  const setSelectedProjectId = useEditor().setSelectedProjectId
  const view = useEditor().view

  useEffect(() => {
    if (id) {
      void loadCurrent(id).then(() => setSelectedProjectId(id))
    }
  }, [id, loadCurrent, setSelectedProjectId])

  // Sync editor store from project
  useEffect(() => {
    if (!current) return
    const e = useEditor.getState()
    if (e.selectedProjectId !== current.id) {
      setSelectedProjectId(current.id)
      useEditor.setState({ elements: current.elements, clips: current.clips })
    }
  }, [current, setSelectedProjectId])

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        window.dispatchEvent(new Event('pixelcraft:undo'))
      }
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void saveCurrent()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveCurrent])

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--color-bg)]" style={{ paddingRight: useUI((s) => s.aiPanelOpen ? '26rem' : '0') }}>
      <TopBar />
      <div className="flex-1 flex min-h-0">
        {view !== 'video' ? <LeftSidebar /> : null}
        <div className="flex-1 relative">
          {view === 'video' ? <Studio /> : <CanvasEditor />}
        </div>
        {view !== 'video' ? <RightSidebar /> : null}
      </div>

      {useUI((s) => s.aiPanelOpen) && <AIAssistant />}
    </div>
  )
}

export { navigate }
