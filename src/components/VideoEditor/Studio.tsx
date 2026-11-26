import { useEffect } from 'react'
import { useProjects } from '../../store/projectsStore'
import { useEditor } from '../../store/editor'
import StudioCenter from './StudioCenter'
import AssetRail from './AssetRail'
import PropertyInspector from './PropertyInspector'
import StudioTimeline from './StudioTimeline'

export default function Studio() {
  const { current: project } = useProjects()
  useEffect(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null
    if (v && project) {
      v.onloadedmetadata = () => {
        v.currentTime = useEditor.getState().time
      }
    }
  }, [project])

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--color-bg)] animate-slide-in">
      <div className="flex flex-1 min-h-0">
        <AssetRail />
        <div className="flex-1 flex flex-col min-w-0">
          <StudioCenter />
          <StudioTimeline />
        </div>
        <PropertyInspector />
      </div>
    </div>
  )
}
