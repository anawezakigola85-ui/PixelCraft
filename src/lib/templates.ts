/**
 * Apply a template to a new project: creates a real, editable, persisted
 * project whose canvas, background and elements match the gallery preview.
 */

import type { Project, ProjectElement, Template } from './types'
import { newProject, saveProject, ASPECT_RATIOS } from './projects'
import { useProjects } from '../store/projectsStore'
import { useAuth } from '../store/authStore'
import { useEditor } from '../store/editor'
import { v4 } from '../store/ids'
import { navigate } from '../app/Router'

export async function applyTemplate(template: Template): Promise<Project> {
  const project = newProject(
    template.name,
    'social',
    template.aspectRatio,
    useAuth.getState().session?.userId,
  )
  const size = ASPECT_RATIOS[template.aspectRatio]

  const elements: ProjectElement[] = template.elements.map((el, index) => ({
    ...el,
    id: v4(),
    name: el.type === 'text' ? `Text: ${(el.text || '').slice(0, 18)}` : `Shape ${index + 1}`,
    z: (el.z || index + 1) * 10,
    locked: false,
    hidden: false,
  })) as ProjectElement[]

  const seeded: Project = {
    ...project,
    background: template.background || '#090A0F',
    canvasWidth: size.w,
    canvasHeight: size.h,
    elements,
    updatedAt: Date.now(),
  }

  // Persist first — the editor loads the project from IndexedDB by id.
  await saveProject(seeded)

  useProjects.setState({
    current: seeded,
    projects: [seeded, ...useProjects.getState().projects.filter((p) => p.id !== seeded.id)],
  })
  useEditor.setState({
    selectedProjectId: seeded.id,
    selectedElementId: undefined,
    elements,
    clips: [],
  })

  navigate(`/editor/${seeded.id}`)
  return seeded
}
