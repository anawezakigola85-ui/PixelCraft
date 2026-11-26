import { useCallback, useMemo, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Rect, Circle, Line, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useProjects } from '../../store/projectsStore'
import { useEditor } from '../../store/editor'
import { downloadBlob } from '../../lib/projects'
import { cn } from '../../lib/utils'
import type { ProjectElement } from '../../lib/types'

type Tool = 'select' | 'move' | 'image' | 'text' | 'shape' | 'crop'

interface DragEnd {
  target: { x(): number; y(): number; width(): number; height(): number }
}

const TOOL_META: Record<Exclude<Tool, 'move'>, { label: string; shortcut: string; icon: string }> = {
  select: { label: 'Select', shortcut: '1', icon: 'target' },
  image: { label: 'Image', shortcut: '2', icon: 'image' },
  text: { label: 'Text', shortcut: '3', icon: 'type' },
  shape: { label: 'Shapes', shortcut: '4', icon: 'square' },
  crop: { label: 'Crop', shortcut: '5', icon: 'crop' },
}

function shapeVariant(el: ProjectElement) {
  return (el.params?.shape as string) || 'rect'
}

function ElementNode({ el, onClick }: { el: ProjectElement; onClick: () => void }) {
  const setEl = useEditor().updateElement

  if (el.type === 'text') {
    return (
      <Text
        name={el.id}
        text={el.text || ''}
        x={el.x}
        y={el.y}
        width={el.width || 400}
        fontSize={el.fontSize || 32}
        fontFamily={el.fontFamily || "'Inter', sans-serif"}
        fontStyle={el.fontStyle || 'normal'}
        textAlign={el.textAlign || 'left'}
        fill={el.color || '#ffffff'}
        draggable
        onClick={onClick}
        onDragEnd={(e: DragEnd) => setEl(el.id, { x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e: DragEnd) => setEl(el.id, { x: e.target.x(), y: e.target.y(), width: e.target.width(), height: e.target.height() })}
      />
    )
  }

  if (el.type === 'shape') {
    const variant = shapeVariant(el)
    const common = {
      key: el.id,
      name: el.id,
      x: el.x,
      y: el.y,
      width: el.width || 200,
      height: el.height || 200,
      fill: el.fill || '#6366f1',
      cornerRadius: el.cornerRadius || 0,
      draggable: true,
      onClick,
      onDragEnd: (e: DragEnd) => setEl(el.id, { x: e.target.x(), y: e.target.y() }),
    }
    if (variant === 'circle') return <Circle {...common} radius={(el.width || 200) / 2} />
    if (variant === 'line')
      return <Line {...common} points={el.points?.flat() || [0, 0, el.width, el.height]} stroke={el.fill || '#fff'} strokeWidth={4} />
    return <Rect {...common} />
  }

  if (!el.src) return null
  const img = useMemo(() => {
    const i = new Image()
    i.src = el.src as string
    return i
  }, [el.src])
  return (
    <KonvaImage
      name={el.id}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width || 300}
      height={el.height || 300}
      draggable
      opacity={el.opacity ?? 1}
      onClick={onClick}
      onDragEnd={(e: DragEnd) => setEl(el.id, { x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e: DragEnd) => setEl(el.id, { x: e.target.x(), y: e.target.y(), width: e.target.width(), height: e.target.height() })}
    />
  )
}

export default function CanvasEditor() {
  const { current: project, updateCurrent } = useProjects()
  const elements = useEditor().elements
  const selectedId = useEditor().selectedElementId
  const removeElement = useEditor().removeElement
  const duplicateElement = useEditor().duplicateElement
  const moveElement = useEditor().moveElement
  const setSelectedElementId = useEditor().setSelectedElementId
  const selectedElement = elements.find((e) => e.id === selectedId)

  const [stageRef, setStageRef] = useState<Konva.Stage | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [filters, setFilters] = useState({ brightness: 0, contrast: 0, saturation: 0, blur: 0 })
  const [propsEl, setPropsEl] = useState<ProjectElement | null>(null)

  useMemo(() => setPropsEl(selectedElement ?? null), [selectedElement])

  const onElementClick = useCallback(
    (el: ProjectElement) => setSelectedElementId(el.id),
    [setSelectedElementId],
  )

  const saveFilters = useCallback(() => {
    if (!propsEl) return
    const next = { ...(propsEl.params || {}), ...filters }
    useEditor().updateElement(propsEl.id, { params: next })
    if (project) void updateCurrent({ elements: elements.map((e) => (e.id === propsEl.id ? { ...e, params: next } : e)) })
  }, [propsEl, filters, project, elements, updateCurrent])

  const exportImage = useCallback(
    (format: 'png' | 'jpeg' | 'webp') => {
      if (!stageRef) return
      const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp'
      const dataUrl = stageRef.toDataURL({ mimeType, quality: 0.9 })
      const blob = new Blob([dataUrl], { type: mimeType })
      downloadBlob(blob, `${project?.name || 'canvas'}.${format === 'jpeg' ? 'jpg' : format}`)
    },
    [stageRef, project],
  )

  if (!project) return null

  return (
    <div className="relative h-full flex flex-col gap-3 p-4 animate-slide-in">
      {/* Toolbar — like Canva/TikTok control bar */}
      <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex gap-1">
          {(['select', 'image', 'text', 'shape'] as const).map((t) => (
            <button
              key={t}
              className={cn(
                'h-8 px-3 rounded-lg text-xs transition flex items-center gap-2',
                tool === t ? 'glass text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5',
              )}
              onClick={() => setTool(t)}
              title={TOOL_META[t].label}
            >
              {t}
            </button>
          ))}
          <button
            className="h-8 px-3 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5"
            onClick={() => setSelectedElementId(undefined)}
          >
            unselect
          </button>
        </div>
        <div className="w-px bg-[var(--color-border)] mx-1 h-6" />
        <div className="flex gap-2">
          <button
            className="h-8 px-3 rounded-lg bg-[var(--color-panel-2)] border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:border-[var(--color-accent-3)] hover:bg-white/5"
            onClick={saveFilters}
          >
            Apply Filters
          </button>
          {(['png', 'jpeg', 'webp'] as const).map((f) => (
            <button
              key={f}
              className="h-8 px-3 rounded-lg brand-gradient text-black text-xs font-semibold shadow"
              onClick={() => exportImage(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Filters panel — CapCut style */}
      {propsEl && (
        <div className="glass rounded-xl px-4 py-3 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-3">
            <span className="font-semibold">Filters — {propsEl.name || propsEl.id}</span>
            <span className="flex gap-1.5">
              <input type="color" value={(propsEl.params?.color as string) || '#a371f7'} onChange={(e) => useEditor().updateElement(propsEl.id, { params: { ...(propsEl.params || {}), color: e.target.value } })} aria-label="primary color" />
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['brightness', 'contrast', 'saturation', 'blur'] as const).map((k) => (
              <label key={k} className="flex flex-col items-center text-[9px] text-[var(--color-text-muted)]">
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={filters[k]}
                  onChange={(e) => setFilters((f) => ({ ...f, [k]: Number(e.target.value) }))}
                  className="w-14"
                  aria-label={k}
                />
                {k}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex justify-center rounded-xl shadow-2xl">
        <Stage
          ref={setStageRef}
          width={project.canvasWidth}
          height={project.canvasHeight}
          style={{ background: 'transparent', cursor: 'default' }}
          onContextMenu={(e) => e.evt.preventDefault()}
        >
          <Layer name="bg">
            <Rect fill={project.background} width={project.canvasWidth} height={project.canvasHeight} />
          </Layer>
          <Layer name="elements">
            {elements
              .slice()
              .sort((a, b) => a.z - b.z)
              .map((el) => (
                <ElementNode key={el.id} el={el} onClick={() => onElementClick(el)} />
              ))}
            {selectedId && (() => {
              const sel = stageRef?.find(`#${selectedId}`)[0]
              return sel ? <Transformer nodes={[sel]} resizeEnabled rotationEnabled /> : null
            })()}
          </Layer>
        </Stage>
      </div>

      {/* Quick actions bar */}
      <div className="flex gap-2 text-xs text-[var(--color-text-muted)] glass rounded-lg px-3 py-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <span>size: {project.canvasWidth}×{project.canvasHeight}</span>
        <span>elements: {elements.length}</span>
        <button className="ml-auto" onClick={() => duplicateElement(elements[0]?.id || '')}>
          Duplicate
        </button>
        <button onClick={() => removeElement(elements[0]?.id || '')}>Delete</button>
        <button onClick={() => moveElement(elements[0]?.id || '', true)}>Move to top</button>
      </div>
    </div>
  )
}
