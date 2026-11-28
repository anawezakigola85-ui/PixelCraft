/**
 * Shared preview renderer used by template cards, project cards and the Pro
 * Studio canvas. It paints the real element list (text, shapes and images),
 * so the gallery, dashboard and editor all show the same artwork.
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

function transformFor(el: PreviewElement, x: number, y: number, width: number, height: number) {
  const rotation = Number(el.params?.rotation || 0)
  const base = Number(el.params?.scale || 1)
  // `scaleX`/`scaleY` are set when the editor's "Uniform scale" toggle is off.
  const scaleX = Number(el.params?.scaleX ?? base)
  const scaleY = Number(el.params?.scaleY ?? base)
  if (!rotation && scaleX === 1 && scaleY === 1) return undefined
  const cx = x + width / 2
  const cy = y + height / 2
  return `rotate(${rotation} ${cx} ${cy}) translate(${cx * (1 - scaleX)} ${cy * (1 - scaleY)}) scale(${scaleX} ${scaleY})`
}

export default function DesignPreview({
  design,
  className,
  preserveAspectRatio = 'xMidYMid meet',
  transparent = false,
  interactive = false,
  selectedElementId,
  onElementClick,
}: {
  design: PreviewDesign
  className?: string
  preserveAspectRatio?: string
  transparent?: boolean
  interactive?: boolean
  selectedElementId?: string
  onElementClick?: (id: string) => void
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
    const transform = transformFor(el, x, y, width, height)
    const selected = interactive && !!el.id && el.id === selectedElementId
    const filter = el.params?.filter ? String(el.params.filter) : undefined

    let node = null
    if (el.type === 'text') {
      const align = el.textAlign || 'left'
      const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
      const tx = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x
      node = (
        <text
          x={tx}
          y={y}
          fill={el.color || '#FFFFFF'}
          fontFamily={el.fontFamily || "'Inter', ui-sans-serif, system-ui, sans-serif"}
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
    } else if (el.type === 'shape') {
      const shape = String(el.params?.shape || 'rect')
      const fill = el.fill || '#7C3AED'
      if (shape === 'circle') {
        node = <circle cx={x + width / 2} cy={y + height / 2} r={Math.min(width, height) / 2} fill={fill} opacity={opacity} />
      } else if (shape === 'line') {
        node = (
          <line
            x1={x}
            y1={y}
            x2={x + width}
            y2={y + height}
            stroke={fill}
            strokeWidth={el.cornerRadius || 6}
            opacity={opacity}
          />
        )
      } else {
        node = <rect x={x} y={y} width={width} height={height} rx={el.cornerRadius || 0} fill={fill} opacity={opacity} />
      }
    } else if (el.type === 'image' && el.src) {
      node = (
        <image
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

    if (!node) return null

    return (
      <g
        key={el.id || index}
        transform={transform}
        style={filter ? { filter } : undefined}
        className={interactive && !el.locked ? 'cursor-pointer' : undefined}
        onClick={interactive && el.id && !el.locked ? () => onElementClick?.(el.id as string) : undefined}
      >
        {node}
        {selected && (
          <rect
            x={x - 8}
            y={y - 8}
            width={width + 16}
            height={height + 16}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={4 / Number(el.params?.scale || 1)}
            strokeDasharray="14 10"
            pointerEvents="none"
          />
        )}
      </g>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', transparent ? 'bg-transparent' : 'bg-[#090A0F]', className)}>
      {!transparent && (
        <div
          className="absolute inset-0 opacity-70 blur-2xl"
          style={{
            background: `radial-gradient(circle at 18% 18%, ${c1}55, transparent 58%), radial-gradient(circle at 82% 78%, ${c2}44, transparent 58%)`,
          }}
        />
      )}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio={preserveAspectRatio}
        role="img"
        aria-label={design.name || 'Design preview'}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} stopOpacity={transparent ? '0.12' : '0.28'} />
            <stop offset="100%" stopColor={c2} stopOpacity={transparent ? '0.04' : '0.08'} />
          </linearGradient>
        </defs>
        {!transparent && <rect width={size.w} height={size.h} fill={background} />}
        <rect width={size.w} height={size.h} fill={`url(#${gradientId})`} />
        {sorted.map(renderElement)}
      </svg>
    </div>
  )
}
