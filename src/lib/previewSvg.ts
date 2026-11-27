/**
 * Converts the same element data used by the editor into an SVG data URL.
 * Used for real timeline/asset thumbnails — no fake gradient stand-ins.
 */

import type { AspectRatio, ProjectElement } from './types'
import { ASPECT_RATIOS } from './projects'

type PreviewElement = Partial<ProjectElement> & { type: string }

export interface PreviewDesignLike {
  aspectRatio?: AspectRatio
  background?: string
  elements: PreviewElement[]
  layoutPreview?: { colors?: string[] }
}

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function transformFor(el: PreviewElement, x: number, y: number, width: number, height: number) {
  const rotation = Number(el.params?.rotation || 0)
  const scale = Number(el.params?.scale || 1)
  if (!rotation && scale === 1) return ''
  const cx = x + width / 2
  const cy = y + height / 2
  return ` transform="rotate(${rotation} ${cx} ${cy}) translate(${cx * (1 - scale)} ${cy * (1 - scale)}) scale(${scale})"`
}

function elementMarkup(el: PreviewElement) {
  const opacity = typeof el.opacity === 'number' ? el.opacity : 1
  const x = el.x || 0
  const y = el.y || 0
  const width = el.width || 200
  const height = el.height || 80
  const fill = el.fill || '#7C3AED'
  const transform = transformFor(el, x, y, width, height)
  const filter = el.params?.filter ? ` style="filter:${esc(el.params.filter)}"` : ''
  const common = ` opacity="${opacity}"${transform}${filter}`

  if (el.type === 'text') {
    const align = el.textAlign || 'left'
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
    const tx = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x
    return `<text x="${tx}" y="${y}" fill="${esc(el.color || '#FFFFFF')}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="${el.fontSize || 48}" font-weight="${esc(el.fontWeight || 700)}" text-anchor="${anchor}" dominant-baseline="hanging"${common}>${esc(el.text || '')}</text>`
  }

  if (el.type === 'shape') {
    const shape = String(el.params?.shape || 'rect')
    if (shape === 'circle') {
      return `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="${Math.min(width, height) / 2}" fill="${esc(fill)}"${common}/>`
    }
    if (shape === 'line') {
      return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y + height}" stroke="${esc(fill)}" stroke-width="${el.cornerRadius || 6}"${common}/>`
    }
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${el.cornerRadius || 0}" fill="${esc(fill)}"${common}/>`
  }

  if (el.type === 'image' && el.src) {
    return `<image href="${esc(el.src)}" x="${x}" y="${y}" width="${width}" height="${height}" preserve-aspect-ratio="none"${common}/>`
  }

  return ''
}

export function designToSvgMarkup(
  design: PreviewDesignLike,
  options: { gradientId?: string; transparent?: boolean } = {},
) {
  const { w, h } = design.aspectRatio ? ASPECT_RATIOS[design.aspectRatio] : ASPECT_RATIOS['1:1']
  const gradientId = options.gradientId || 'preview-gradient'
  const colors = (design.layoutPreview?.colors || []).filter(Boolean)
  const c1 = colors[0] || '#7C3AED'
  const c2 = colors[1] || '#00E5FF'
  const body = [...(design.elements || [])]
    .filter((el) => !el.hidden)
    .sort((a, b) => (a.z || 0) - (b.z || 0))
    .map(elementMarkup)
    .join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`,
    '<defs>',
    `<linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="${esc(c1)}" stop-opacity="0.28"/>`,
    `<stop offset="100%" stop-color="${esc(c2)}" stop-opacity="0.08"/>`,
    '</linearGradient>',
    '</defs>',
    options.transparent ? '' : `<rect width="${w}" height="${h}" fill="${esc(design.background || '#090A0F')}"/>`,
    `<rect width="${w}" height="${h}" fill="url(#${gradientId})"/>`,
    body,
    '</svg>',
  ].join('')
}

export function designToDataUrl(design: PreviewDesignLike, transparent = false) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(designToSvgMarkup(design, { transparent }))}`
}
