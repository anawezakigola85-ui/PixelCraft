/**
 * Shared, dependency-free preview renderer used by template cards and project
 * cards. It paints the real element list (text, shapes and images) instead of
 * a generic placeholder, so what you see in the library is what opens in the
 * editor.
 */

import { useId } from 'react'
import type { AspectRatio, ProjectElement } from '../../lib/types'
import { ASPECT_RATIOS } from '../../lib/projects'
import { cn } from '../../lib/utils'

type PreviewElement = Partial<ProjectElement> & { type: string }

interface PreviewDesign {
  id?: string
  name?: string
  aspectRatio?: AspectRatio
  background?: string
  elements: PreviewElement[]
  layoutPreview?: { colors?: string[] }
}

export default function DesignPreview({
  design,
  className,
  preserveAspectRatio = 'xMidYMid meet',
}: {
  design: PreviewDesign
  className?: string
  preserveAspectRatio?: string
}) {
  const rawId = useId()
  const gradientId = `preview-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const size = design.aspectRatio ? ASPECT_RATIOS[design.aspectRatio] : ASPECT_RATIOS['1:1']
  const colors = (design.layoutPreview?.colors || []).filter(Boolean)
  const c1 = colors[0] || '#7C3AED'
  const c2 = colors[1] || '#00E5FF'
  const background = design.background || '#090A0F'

  const sorted = [...(design.elements || [])]
    .filter((el) => !el.hidden)
    .sort((a, b) => (a.z || 0) - (b.z || 0))

  const renderElement = (el: PreviewElement, index: number) => {
    const opacity = typeof el.opacity === 'number' ? el.opacity : 1
    const x = el.x || 0
    const y = el.y || 0
    const width = el.width || 200
    const height = el.height || 80

    if (el.type === 'text') {
      const align = el.textAlign || 'left'
      const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
      const tx = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x
      return (
        <text
          key={index}
          x={tx}
          y={y}
          fill={el.color || '#FFFFFF'}
          fontFamily="'Inter', ui-sans-serif, system-ui, sans-serif"
          fontSize={el.fontSize || 48}
          fontWeight={el.fontWeight || 700}
          fontStyle={el.fontStyle || 'normal'}
          textAnchor={anchor}
          dominantBaseline="hanging"
          opacity={opacity}
        >
          {el.text || ''}
        </text>
      )
    }

    if (el.type === 'shape') {
      const shape = String(el.params?.shape || 'rect')
      const fill = el.fill || '#7C3AED'
      if (shape === 'circle') {
        return (
          <circle
            key={index}
            cx={x + width / 2}
            cy={y + height / 2}
            r={Math.min(width, height) / 2}
            fill={fill}
            opacity={opacity}
          />
        )
      }
      if (shape === 'line') {
        return (
          <line
            key={index}
            x1={x}
            y1={y}
            x2={x + width}
            y2={y + height}
            stroke={fill}
            strokeWidth={el.cornerRadius || 6}
            opacity={opacity}
          />
        )
      }
      return (
        <rect
          key={index}
          x={x}
          y={y}
          width={width}
          height={height}
          rx={el.cornerRadius || 0}
          fill={fill}
          opacity={opacity}
        />
      )
    }

    if (el.type === 'image' && el.src) {
      return (
        <image
          key={index}
          href={el.src}
          x={x}
          y={y}
          width={width}
          height={height}
          opacity={opacity}
          preserveAspectRatio="none"
        />
      )
    }

    return null
  }

  return (
    <div className={cn('relative overflow-hidden bg-[#090A0F]', className)}>
      <div
        className="absolute inset-0 opacity-70 blur-2xl"
        style={{
          background: `radial-gradient(circle at 18% 18%, ${c1}55, transparent 58%), radial-gradient(circle at 82% 78%, ${c2}44, transparent 58%)`,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio={preserveAspectRatio}
        role="img"
        aria-label={design.name || 'Design preview'}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} stopOpacity="0.28" />
            <stop offset="100%" stopColor={c2} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <rect width={size.w} height={size.h} fill={background} />
        <rect width={size.w} height={size.h} fill={`url(#${gradientId})`} />
        {sorted.map(renderElement)}
      </svg>
    </div>
  )
}
