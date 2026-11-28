import { useCallback, useEffect } from 'react'
import { useRouteParam } from './Router'
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
  const { current, loadCurrent, saveCurrent, updateCurrent } = useProjects()
  const view = useEditor((s) => s.view)
  const aiPanelOpen = useUI((s) => s.aiPanelOpen)

  // Load the project for this route. The sync effect below adopts it into the
  // editor store once `current` is available.
  useEffect(() => {
    if (id) void loadCurrent(id)
  }, [id, loadCurrent])

  useEffect(() => {
    if (!current) return
    const state = useEditor.getState()
    if (state.selectedProjectId !== current.id) {
      useEditor.setState({
        selectedProjectId: current.id,
        elements: current.elements ?? [],
        clips: current.clips ?? [],
        selectedElementId: undefined,
        selectedClipId: undefined,
        playing: false,
        time: 0,
        history: [],
        future: [],
      })
    }
  }, [current])

  /** Always fold the live editor state into the project before persisting. */
  const saveWithEditor = useCallback(async () => {
    const editor = useEditor.getState()
    if (current && editor.selectedProjectId === current.id) {
      updateCurrent({ elements: editor.elements, clips: editor.clips })
    }
    await saveCurrent()
  }, [current, updateCurrent, saveCurrent])

  // Only shortcuts that are actually implemented are handled here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        void saveWithEditor()
      } else if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) useEditor.getState().redo()
        else useEditor.getState().undo()
      } else if (key === 'y') {
        e.preventDefault()
        useEditor.getState().redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveWithEditor])

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--color-bg)]" style={{ paddingRight: aiPanelOpen ? '26rem' : '0' }}>
      <TopBar />
      <div className="flex-1 flex min-h-0">
        {view !== 'video' ? <LeftSidebar /> : null}
        <div className="flex-1 relative">
          {view === 'video' ? <Studio /> : <CanvasEditor />}
        </div>
        {view !== 'video' ? <RightSidebar /> : null}
      </div>

      {aiPanelOpen && <AIAssistant />}
    </div>
  )
}

export { navigate } from './Router'
