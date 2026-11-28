import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Rect, Circle, Line, Transformer } from 'react-konva'
import Konva from 'konva'
import { useProjects } from '../../store/projectsStore'
import { useEditor } from '../../store/editor'
import { useSettings } from '../../store/settings'
import { downloadBlob, fileToDataURL } from '../../lib/projects'
import { cn } from '../../lib/utils'
import type { ProjectElement } from '../../lib/types'

type Tool = 'select' | 'image' | 'text' | 'shape'
type FilterKey = 'brightness' | 'contrast' | 'saturation' | 'blur'

interface DragEnd {
  target: { x(): number; y(): number; width(): number; height(): number }
}
interface TransformEnd extends DragEnd {
  target: DragEnd['target'] & {
    scaleX(): number
    scaleX(value: number): number
    scaleY(): number
    scaleY(value: number): number
    rotation(): number
  }
}

const TOOL_META: Record<Tool, { label: string; shortcut: string }> = {
  select: { label: 'Select', shortcut: '1' },
  image: { label: 'Image', shortcut: '2' },
  text: { label: 'Text', shortcut: '3' },
  shape: { label: 'Shapes', shortcut: '4' },
}

function transformProps(el: ProjectElement) {
  const scale = Number(el.params?.scale || 1)
  return { rotation: Number(el.params?.rotation || 0), scaleX: scale, scaleY: scale }
}

function persistTransform(el: ProjectElement, e: TransformEnd) {
  const node = e.target
  const sx = node.scaleX()
  const sy = node.scaleY()
  const rotation = node.rotation()
  const scale = Number(el.params?.scale || 1)
  node.scaleX(1)
  node.scaleY(1)
  return {
    x: node.x(),
    y: node.y(),
    width: Math.max(10, node.width() * sx),
    height: Math.max(10, node.height() * sy),
    params: { ...(el.params || {}), rotation, scale: scale * ((sx + sy) / 2) },
  }
}

/** Konva filters need a cached node. Map the -1..1 UI values to filter units. */
function filterConfig(el: ProjectElement) {
  const params = el.params || {}
  const brightness = Number(params.brightness ?? 0)
  const contrast = Number(params.contrast ?? 0)
  const saturation = Number(params.saturation ?? 0)
  const blur = Number(params.blur ?? 0)
  const tintAlpha = el.type === 'image' ? Number(params.tintAlpha ?? 0) : 0
  const filters: Array<Konva.Filter> = []
  if (brightness) filters.push(Konva.Filters.Brightness)
  if (contrast) filters.push(Konva.Filters.Contrast)
  if (saturation) filters.push(Konva.Filters.HSL)
  if (blur > 0) filters.push(Konva.Filters.Blur)
  if (tintAlpha > 0) filters.push(Konva.Filters.RGBA)
  const raw = typeof params.color === 'string' ? params.color.replace('#', '') : 'a371f7'
  const hex = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  return {
    filters,
    brightness: 1 + brightness,
    contrast: contrast * 100,
    saturation,
    blurRadius: blur * 20,
    red: parseInt(hex.slice(0, 2), 16) || 0,
    green: parseInt(hex.slice(2, 4), 16) || 0,
    blue: parseInt(hex.slice(4, 6), 16) || 0,
    alpha: tintAlpha,
  }
}

function filterProps(el: ProjectElement) {
  const f = filterConfig(el)
  return {
    filters: f.filters,
    brightness: f.brightness,
    contrast: f.contrast,
    saturation: f.saturation,
    blurRadius: f.blurRadius,
    red: f.red,
    green: f.green,
    blue: f.blue,
    alpha: f.alpha,
  }
}

/** Re-cache whenever the element or its filter settings change. */
function useCachedFilters<T extends Konva.Node>(ref: RefObject<T | null>, cacheKey: string, enabled: boolean) {
  useEffect(() => {
    const node = ref.current
    if (!node) return
    try {
      if (node.isCached()) node.clearCache()
      if (enabled) node.cache()
    } catch {
      // Zero-sized nodes cannot be cached; filters simply stay inactive.
    }
  }, [ref, cacheKey, enabled])
}

function loadDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new window.Image()
    image.onload = () => resolve({ width: image.naturalWidth || 320, height: image.naturalHeight || 200 })
    image.onerror = () => resolve({ width: 320, height: 200 })
    image.src = src
  })
}

function ElementNode({
  el,
  onClick,
  onChange,
}: {
  el: ProjectElement
  onClick: () => void
  onChange: (id: string, patch: Partial<ProjectElement>) => void
}) {
  const textRef = useRef<Konva.Text | null>(null)
  const shapeRef = useRef<Konva.Shape | null>(null)
  const imageRef = useRef<Konva.Image | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (el.type !== 'image' || !el.src) return
    const image = new window.Image()
    image.onload = () => setImg(image)
    image.src = el.src
    return () => { image.onload = null }
  }, [el.type, el.src])

  const f = filterConfig(el)
  const cacheKey = JSON.stringify([
    f.filters.length, f.brightness, f.contrast, f.saturation, f.blurRadius, f.alpha,
    el.width, el.height, el.text, el.src, el.type,
  ])
  const enabled = f.filters.length > 0
  useCachedFilters(textRef, cacheKey, enabled && el.type === 'text')
  useCachedFilters(shapeRef, cacheKey, enabled && el.type === 'shape')
  useCachedFilters(imageRef, cacheKey, enabled && el.type === 'image' && !!img)

  const events = {
    onClick: el.locked ? undefined : onClick,
    onTap: el.locked ? undefined : onClick,
    onDragEnd: el.locked ? undefined : (e: DragEnd) => onChange(el.id, { x: e.target.x(), y: e.target.y() }),
    onTransformEnd: el.locked ? undefined : (e: TransformEnd) => onChange(el.id, persistTransform(el, e)),
  }
  const common = {
    id: el.id,
    name: el.id,
    x: el.x,
    y: el.y,
    width: el.width || 200,
    height: el.height || 200,
    ...transformProps(el),
    draggable: !el.locked,
    listening: !el.locked,
    ...filterProps(el),
    ...events,
  }

  if (el.type === 'text') {
    return (
      <Text
        ref={textRef}
        text={el.text || ''}
        fontSize={el.fontSize || 32}
        fontFamily={el.fontFamily || "'Inter', sans-serif"}
        fontStyle={el.fontStyle || 'normal'}
        textAlign={el.textAlign || 'left'}
        fill={el.color || '#ffffff'}
        {...common}
      />
    )
  }

  if (el.type === 'shape') {
    const variant = (el.params?.shape as string) || 'rect'
    if (variant === 'circle')
      return <Circle ref={shapeRef as RefObject<Konva.Circle>} radius={(el.width || 200) / 2} fill={el.fill || '#6366f1'} {...common} />
    if (variant === 'line')
      return (
        <Line
          ref={shapeRef as RefObject<Konva.Line>}
          points={el.points?.flat() || [0, 0, el.width || 200, 0]}
          stroke={el.fill || '#ffffff'}
          strokeWidth={4}
          {...common}
        />
      )
    return <Rect ref={shapeRef as RefObject<Konva.Rect>} fill={el.fill || '#6366f1'} cornerRadius={el.cornerRadius || 0} {...common} />
  }

  if (!img || !el.src) return null
  return (
    <KonvaImage
      ref={imageRef}
      image={img}
      opacity={el.opacity ?? 1}
      {...common}
    />
  )
}

export default function CanvasEditor() {
  const { current: project } = useProjects()
  const elements = useEditor((s) => s.elements)
  const selectedId = useEditor((s) => s.selectedElementId)
  const selectedElement = elements.find((e) => e.id === selectedId)
  const exportFormat = useSettings((s) => s.exportFormat)
  const exportQuality = useSettings((s) => s.exportQuality)

  const [stageRef, setStageRef] = useState<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const [tool, setTool] = useState<Tool>('select')

  const syncProject = useCallback(() => {
    const store = useProjects.getState()
    if (store.current && useEditor.getState().selectedProjectId === store.current.id) {
      store.updateCurrent({ elements: useEditor.getState().elements })
    }
  }, [])

  const commit = useCallback(
    (id: string, patch: Partial<ProjectElement>) => {
      useEditor.getState().updateElement(id, patch)
      syncProject()
    },
    [syncProject],
  )

  const insertTextAt = useCallback(
    (x: number, y: number) => {
      const id = useEditor.getState().addElement({
        type: 'text',
        name: 'Text',
        text: 'Your text here',
        fontSize: 32,
        color: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        x: Math.round(x),
        y: Math.round(y),
        width: 280,
        height: 56,
      })
      useEditor.getState().setSelectedElementId(id)
      syncProject()
      setTool('select')
    },
    [syncProject],
  )

  const insertShapeAt = useCallback(
    (x: number, y: number) => {
      const id = useEditor.getState().addElement({
        type: 'shape',
        name: 'Rectangle',
        params: { shape: 'rect' },
        fill: '#6366f1',
        cornerRadius: 8,
        x: Math.round(x - 100),
        y: Math.round(y - 75),
        width: 200,
        height: 150,
      })
      useEditor.getState().setSelectedElementId(id)
      syncProject()
      setTool('select')
    },
    [syncProject],
  )

  const openImagePicker = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const src = await fileToDataURL(file)
        const { width: naturalWidth, height: naturalHeight } = await loadDimensions(src)
        const scale = Math.min(1, 400 / naturalWidth)
        const width = Math.max(10, Math.round(naturalWidth * scale))
        const height = Math.max(10, Math.round(naturalHeight * scale))
        const canvasWidth = useProjects.getState().current?.canvasWidth ?? 1280
        const canvasHeight = useProjects.getState().current?.canvasHeight ?? 720
        const id = useEditor.getState().addElement({
          type: 'image',
          name: file.name,
          src,
          x: Math.round((canvasWidth - width) / 2),
          y: Math.round((canvasHeight - height) / 2),
          width,
          height,
          opacity: 1,
        })
        useEditor.getState().setSelectedElementId(id)
        syncProject()
      } catch {
        // A cancelled or unreadable file simply leaves the canvas unchanged.
      }
      setTool('select')
    }
    input.click()
  }, [syncProject])

  const handleTool = useCallback(
    (next: Tool) => {
      if (next === 'image') {
        setTool('image')
        openImagePicker()
        return
      }
      setTool(next)
    },
    [openImagePicker],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const tools: Record<string, Tool> = { '1': 'select', '2': 'image', '3': 'text', '4': 'shape' }
      const next = tools[e.key]
      if (next) {
        e.preventDefault()
        handleTool(next)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        useEditor.getState().removeElement(selectedId)
        useEditor.getState().setSelectedElementId(undefined)
        syncProject()
      } else if (e.key === 'Escape') {
        setTool('select')
        useEditor.getState().setSelectedElementId(undefined)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleTool, selectedId, syncProject])

  // Keep the transformer attached to the live Konva node (including async images).
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer || !stageRef) return
    const el = useEditor.getState().elements.find((item) => item.id === selectedId)
    const node = el && !el.locked && !el.hidden ? stageRef.findOne(`#${el.id}`) : null
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  })

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool !== 'text' && tool !== 'shape') return
    const stage = e.target.getStage()
    if (!stage) return
    if (e.target !== stage && e.target.getLayer()?.name() !== 'bg') return
    const pos = stage.getPointerPosition()
    if (!pos) return
    if (tool === 'text') insertTextAt(pos.x, pos.y)
    else insertShapeAt(pos.x, pos.y)
  }

  const updateFilter = (key: FilterKey, value: number) => {
    if (!selectedElement) return
    commit(selectedElement.id, { params: { ...(selectedElement.params || {}), [key]: value } })
  }

  const resetFilters = () => {
    if (!selectedElement) return
    const params = { ...(selectedElement.params || {}) }
    params.brightness = 0
    params.contrast = 0
    params.saturation = 0
    params.blur = 0
    params.tintAlpha = 0
    commit(selectedElement.id, { params })
  }

  const applyColour = (color: string) => {
    if (!selectedElement) return
    const params = { ...(selectedElement.params || {}), color }
    if (selectedElement.type === 'text') commit(selectedElement.id, { color, params })
    else if (selectedElement.type === 'shape') commit(selectedElement.id, { fill: color, params })
    else commit(selectedElement.id, { params: { ...params, tintAlpha: 0.35 } })
  }

  const exportImage = useCallback(
    async (format: 'png' | 'jpeg' | 'webp') => {
      if (!stageRef) return
      const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp'
      const dataUrl = stageRef.toDataURL({ mimeType, quality: Math.max(0.1, Math.min(1, exportQuality / 100)), pixelRatio: 2 })
      const blob = await fetch(dataUrl).then((response) => response.blob())
      downloadBlob(blob, `${project?.name || 'canvas'}.${format === 'jpeg' ? 'jpg' : format}`)
    },
    [stageRef, project?.name, exportQuality],
  )

  if (!project) return null

  const currentColour =
    selectedElement?.type === 'shape'
      ? selectedElement.fill || '#a371f7'
      : selectedElement?.type === 'text'
        ? selectedElement.color || '#ffffff'
        : typeof selectedElement?.params?.color === 'string'
          ? selectedElement.params.color
          : '#a371f7'

  return (
    <div className="relative h-full flex flex-col gap-3 p-4 animate-slide-in">
      {/* Toolbar — every control changes the canvas or exports real bytes */}
      <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex gap-1">
          {(['select', 'image', 'text', 'shape'] as const).map((t) => (
            <button
              key={t}
              className={cn(
                'h-8 px-3 rounded-lg text-xs transition flex items-center gap-2',
                tool === t ? 'glass text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5',
              )}
              onClick={() => handleTool(t)}
              title={`${TOOL_META[t].label} (${TOOL_META[t].shortcut})`}
            >
              {t}
            </button>
          ))}
          <button
            className="h-8 px-3 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5"
            onClick={() => useEditor.getState().setSelectedElementId(undefined)}
            title="Clear selection (Esc)"
          >
            unselect
          </button>
        </div>
        <div className="w-px bg-[var(--color-border)] mx-1 h-6" />
        <div className="flex gap-2">
          <button
            className="h-8 px-3 rounded-lg bg-[var(--color-panel-2)] border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:border-[var(--color-accent-3)] hover:bg-white/5 disabled:opacity-40"
            onClick={resetFilters}
            disabled={!selectedElement}
            title="Reset filters and tint on the selected element"
          >
            Reset filters
          </button>
          {(['png', 'jpeg', 'webp'] as const).map((f) => (
            <button
              key={f}
              className="h-8 px-3 rounded-lg text-xs font-semibold shadow transition"
              style={exportFormat === f
                ? { background: 'var(--color-accent-2)', color: '#000' }
                : { background: 'var(--color-panel-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              onClick={() => void exportImage(f)}
              title={`Download the canvas as ${f.toUpperCase()}${exportFormat === f ? ' (default from Settings)' : ''}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {tool === 'text' && <p className="text-[10px] text-[var(--color-accent-2)]">Click the canvas to place your text.</p>}
      {tool === 'shape' && <p className="text-[10px] text-[var(--color-accent-2)]">Click the canvas to place a rectangle.</p>}

      {/* Filters panel — edits are live and persisted */}
      {selectedElement && (
        <div className="glass rounded-xl px-4 py-3 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-3">
            <span className="font-semibold">Filters — {selectedElement.name || selectedElement.id}</span>
            <input
              type="color"
              value={currentColour}
              onChange={(e) => applyColour(e.target.value)}
              aria-label="Primary colour"
              title="Set text colour, shape fill or an image tint"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['brightness', 'contrast', 'saturation', 'blur'] as const).map((k) => (
              <label key={k} className="flex flex-col items-center text-[9px] text-[var(--color-text-muted)]">
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={Number(selectedElement.params?.[k] ?? 0)}
                  onChange={(e) => updateFilter(k, Number(e.target.value))}
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
          style={{ background: 'transparent', cursor: tool === 'select' ? 'default' : 'crosshair' }}
          onClick={handleStageClick}
          onContextMenu={(e) => e.evt.preventDefault()}
        >
          <Layer name="bg">
            <Rect fill={project.background} width={project.canvasWidth} height={project.canvasHeight} />
          </Layer>
          <Layer name="elements">
            {elements
              .filter((el) => !el.hidden)
              .slice()
              .sort((a, b) => a.z - b.z)
              .map((el) => (
                <ElementNode key={el.id} el={el} onClick={() => useEditor.getState().setSelectedElementId(el.id)} onChange={commit} />
              ))}
            <Transformer
              ref={transformerRef}
              resizeEnabled
              rotationEnabled
              borderStroke="#a371f7"
              anchorStroke="#a371f7"
              anchorFill="#ffffff"
            />
          </Layer>
        </Stage>
      </div>

      {/* Quick actions on the current selection */}
      <div className="flex gap-2 text-xs text-[var(--color-text-muted)] glass rounded-lg px-3 py-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <span>size: {project.canvasWidth}×{project.canvasHeight}</span>
        <span>elements: {elements.length}</span>
        <button
          className="ml-auto disabled:opacity-40"
          disabled={!selectedId}
          onClick={() => {
            if (!selectedId) return
            const id = useEditor.getState().duplicateElement(selectedId)
            if (id) useEditor.getState().setSelectedElementId(id)
            syncProject()
          }}
        >
          Duplicate
        </button>
        <button
          className="disabled:opacity-40"
          disabled={!selectedId}
          onClick={() => {
            if (!selectedId) return
            useEditor.getState().removeElement(selectedId)
            syncProject()
          }}
        >
          Delete
        </button>
        <button
          className="disabled:opacity-40"
          disabled={!selectedId}
          onClick={() => {
            if (!selectedId) return
            useEditor.getState().moveElement(selectedId, true)
            syncProject()
          }}
        >
          Move to top
        </button>
      </div>
    </div>
  )
}
