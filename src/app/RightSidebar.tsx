import { useEditor } from '../store/editor'
import { useProjects } from '../store/projectsStore'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'

const COLOR_PALETTES = ['#a371f7', '#22d3ee', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#f472b6']

export default function RightSidebar() {
  const { elements, selectedElementId, updateElement, toggleLock, toggleHidden, duplicateElement, removeElement, moveElement } = useEditor()
  const { updateCurrent, current } = useProjects()
  const el = elements.find((e) => e.id === selectedElementId)

  const sync = () => {
    if (current) void updateCurrent({ elements: useEditor().elements })
  }

  return (
    <aside className="w-72 shrink-0 glass-strong border-l border-[var(--color-border)] overflow-y-auto animate-slide-in">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h3 className="font-display font-semibold text-sm">Properties</h3>
      </div>

      <div className="p-4 space-y-5">
        {el ? (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Name</label>
              <Input
                className="mt-1.5 h-8 text-xs"
                value={el.name}
                onChange={(e) => updateElement(el.id, { name: e.target.value })}
                onBlur={sync}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Position</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {(['x', 'y', 'width', 'height'] as const).map((k) => (
                  <div key={k}>
                    <Input
                      type="number"
                      value={el[k] ?? 0}
                      onChange={(e) => updateElement(el.id, { [k]: e.target.value === '' ? 0 : Number(e.target.value) })}
                      onBlur={sync}
                      className="h-8 text-xs"
                      aria-label={k}
                    />
                  </div>
                ))}
              </div>
            </div>

            {el.type === 'text' && (
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Text</label>
                <Input
                  value={el.text || ''}
                  onChange={(e) => updateElement(el.id, { text: e.target.value })}
                  onBlur={sync}
                  className="h-8 text-xs"
                />
                <label className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Font Size</label>
                <Input
                  type="number"
                  value={el.fontSize || 32}
                  onChange={(e) => updateElement(el.id, { fontSize: Number(e.target.value) || 32 })}
                  onBlur={sync}
                  className="h-8 text-xs"
                />
                <div className="flex flex-wrap gap-1">
                  {COLOR_PALETTES.map((c) => (
                    <button
                      key={c}
                      className={cn('w-6 h-6 rounded-lg border border-[var(--color-border)]', el.color === c && 'ring-2 ring-[var(--color-accent-3)])}')}
                      style={{ background: c }}
                      onClick={() => updateElement(el.id, { color: c })}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={el.color || '#ffffff'}
                  onChange={(e) => updateElement(el.id, { color: e.target.value })}
                  className="h-9 w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg cursor-pointer"
                />
              </div>
            )}

            {el.type === 'shape' && (
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Fill</label>
                <input
                  type="color"
                  value={el.fill || '#6366f1'}
                  onChange={(e) => updateElement(el.id, { fill: e.target.value })}
                  className="h-9 w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg"
                />
              </div>
            )}

            <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
              <h4 className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Layers</h4>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => duplicateElement(el.id)}>Duplicate</Button>
                <Button size="sm" variant="destructive" onClick={() => removeElement(el.id)}>Delete</Button>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => moveElement(el.id, true)}>Move to top</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleLock(el.id)}>{el.locked ? 'Unlock' : 'Lock'}</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleHidden(el.id)}>{el.hidden ? 'Show' : 'Hide'}</Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">Select an element to edit its properties.</p>
        )}
      </div>
    </aside>
  )
}
