/**
 * Apply a template to a new project (Phase 4): creates an editable project
 * whose canvas matches the template layout.
 */

import type { ProjectElement, Template } from './types'
import { newProject } from './projects'
import { useProjects } from '../store/projectsStore'
import { useAuth } from '../store/authStore'
import { v4 } from '../store/ids'
import { navigate } from '../app/Router'

export function applyTemplate(template: Template) {
  const project = newProject(template.name, 'social', template.aspectRatio, useAuth.getState().session?.userId)
  const elements: ProjectElement[] = template.elements.map((el) => ({
    ...el,
    name: (el as { name?: string }).name || `Text ${(el.text || '').slice(0, 12)}`,
    id: v4(),
    z: Date.now(),
    locked: false,
    hidden: false,
  }))
  const seeded = { ...project, elements }
  useProjects.setState({ current: seeded, projects: [seeded, ...useProjects.getState().projects] })
  navigate(`/editor/${seeded.id}`)
  return seeded
}
