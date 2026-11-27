/**
 * Shared template builder. Produces complete, editable vertical/square/wide
 * layouts from a short definition, so every gallery card is a real project.
 */

import type { AspectRatio, Template } from '../lib/types'
import { ASPECT_RATIOS } from '../lib/projects'

export type TemplateElement = Template['elements'][number]

function hash(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function makeTemplate(
  id: string,
  name: string,
  category: string,
  style: string,
  text: string[],
  colors: string[],
  aspect: AspectRatio = '1:1',
): Template {
  const { w, h } = ASPECT_RATIOS[aspect]
  const pad = Math.round(w * 0.075)
  const primary = colors[0] || '#a371f7'
  const secondary = colors[1] || '#22d3ee'
  const tertiary = colors[2] || primary
  const variant = hash(id) % 4
  const elements: TemplateElement[] = []

  if (variant === 0) {
    elements.push({
      type: 'shape', params: { shape: 'circle' },
      x: w * 0.52, y: h * 0.04, width: w * 0.72, height: w * 0.72,
      fill: primary, opacity: 0.2, z: 1,
    })
  } else if (variant === 1) {
    elements.push({
      type: 'shape', params: { shape: 'rect' },
      x: 0, y: 0, width: w, height: h * 0.42,
      fill: primary, opacity: 0.14, z: 1,
    })
    elements.push({
      type: 'shape', params: { shape: 'circle' },
      x: w * 0.62, y: h * 0.55, width: w * 0.55, height: w * 0.55,
      fill: secondary, opacity: 0.16, z: 2,
    })
  } else if (variant === 2) {
    elements.push({
      type: 'shape', params: { shape: 'circle' },
      x: -w * 0.18, y: h * 0.46, width: w * 0.72, height: w * 0.72,
      fill: primary, opacity: 0.18, z: 1,
    })
    elements.push({
      type: 'shape', params: { shape: 'circle' },
      x: w * 0.55, y: h * 0.1, width: w * 0.62, height: w * 0.62,
      fill: secondary, opacity: 0.14, z: 2,
    })
  } else {
    elements.push({
      type: 'shape', params: { shape: 'rect' },
      x: w * 0.66, y: 0, width: w * 0.34, height: h,
      fill: primary, opacity: 0.13, z: 1,
    })
    elements.push({
      type: 'shape', params: { shape: 'rect' },
      x: 0, y: h * 0.72, width: w, height: h * 0.28,
      fill: secondary, opacity: 0.1, z: 2,
    })
  }

  elements.push({
    type: 'shape', params: { shape: 'rect' },
    x: pad, y: Math.round(h * 0.1),
    width: Math.min(Math.round(w * 0.22), 280),
    height: Math.max(10, Math.round(w * 0.012)),
    fill: secondary, cornerRadius: 999, z: 3,
  })

  const longest = Math.max(...text.map((line) => line.length), 1)
  const maxFont = aspect === '16:9' ? 108 : aspect === '9:16' ? 92 : 88
  const fitFont = Math.floor((w - pad * 2) / (longest * 0.6))
  const fontSize = clamp(Math.min(maxFont, fitFont), 30, maxFont)
  const lineHeight = Math.round(fontSize * 1.24)
  const startY = Math.round(h * (aspect === '16:9' ? 0.3 : aspect === '9:16' ? 0.34 : 0.36))

  text.forEach((line, i) => {
    elements.push({
      type: 'text',
      text: line,
      x: pad,
      y: startY + i * lineHeight,
      width: w - pad * 2,
      height: lineHeight,
      fontSize: i === 0 ? fontSize : Math.round(fontSize * 0.88),
      fontWeight: i === 0 ? 800 : 600,
      color: i === 0 ? '#FFFFFF' : colors[i % colors.length] || '#E5E7EB',
      textAlign: 'left',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      z: 10 + i,
    })
  })

  elements.push({
    type: 'shape', params: { shape: 'rect' },
    x: pad, y: h - pad - 18,
    width: Math.min(Math.round(w * 0.3), 300),
    height: 10,
    fill: tertiary, cornerRadius: 999, z: 5,
  })

  return {
    id,
    name,
    description: `${style} · ${aspect} design`,
    category,
    style,
    aspectRatio: aspect,
    background: '#090A0F',
    elements,
    layoutPreview: {
      colors: colors.slice(0, 4),
      shapeCount: elements.filter((el) => el.type === 'shape').length,
      textLines: text.slice(0, 3),
    },
  }
}
