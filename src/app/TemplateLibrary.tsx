import { useEffect, useMemo, useState } from 'react'
import { Search, Filter, Star, LayoutGrid, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { TEMPLATES } from '../data/templates'
import { applyTemplate } from '../lib/templates'
import { useUI } from '../store/ui'
import { useSettings } from '../store/settings'
import type { Language } from '../lib/i18n'
import { t } from '../lib/i18n'
import type { Template } from '../lib/types'
import { cn } from '../lib/utils'

const CATEGORIES = [
  'All', 'TikTok', 'Instagram', 'YouTube', 'Reels', 'Shorts', 'Music', 'Cinematic',
  'Business', 'Marketing', 'Education', 'Gaming', 'Sports', 'Fashion', 'Birthday',
  'Event', 'Travel', 'Motivation', 'Quotes', 'Ads',
]

export default function TemplateLibrary() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [featured] = useState(() => TEMPLATES.slice(0, 4))
  const langVal = useSettings((s) => s.language) as Language
  const { setSearchQuery } = useUI()

  useEffect(() => setSearchQuery(''), [])

  const filtered = useMemo(
    () =>
      TEMPLATES.filter((tp) => {
        const catOk = category === 'All' || tp.category.toLowerCase() === category.toLowerCase()
        const s = search.trim().toLowerCase()
        const nameOk = tp.name.toLowerCase().includes(s) || tp.style.toLowerCase().includes(s)
        return catOk && (s ? nameOk : true)
      }),
    [search, category],
  )

  const preview = (tp: Template) => (
    <div className="space-y-2" style={{ height: 110 }}>
      {tp.layoutPreview?.textLines?.slice(0, 2).map((l: string, i: number) => (
        <p key={i} className={cn('text-[8px] font-mono truncate leading-none', i === 0 ? 'text-white font-semibold' : 'text-[var(--color-text)] opacity-60')}>
          {l}
        </p>
      ))}
    </div>
  )

  const Tile = ({ tp, hero = false }: { tp: Template; hero?: boolean }) => (
    <button
      className={cn(
        'group glass rounded-2xl p-0 text-left hover:border-[var(--color-accent-3)] hover:translate-y-[-3px] transition-all',
        hero && 'md:col-span-2 lg:col-span-2',
      )}
      onClick={() => applyTemplate(tp)}
    >
      <div
        className="relative h-44 bg-gradient-to-br from-white/5 to-[var(--color-panel-2)] flex items-center justify-center gap-2 p-2 group-hover:shadow-xl transition"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }}
      >
        <div className="flex gap-2 shrink-0">
          {tp.layoutPreview?.colors.slice(0, 3).map((c, i) => (
            <div key={i} className="w-7 h-7 rounded-lg -skew-x-[-10deg] border border-[var(--color-border)]" style={{ background: c }} />
          ))}
        </div>
        <div className="flex-1 min-w-0">{preview(tp)}</div>
      </div>
      <div className="p-3 border-t border-[var(--color-border)]">
        <p className="text-sm font-medium truncate">{tp.name}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] truncate">
          {tp.style} · {tp.aspectRatio}
        </p>
      </div>
    </button>
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 glass-strong border-b border-[var(--color-border)] px-8 py-5">
        <div className="mx-auto max-w-7xl flex items-center gap-4">
          <button onClick={() => (window.location.pathname = '/')} className="text-[var(--color-text)] text-sm">
            ← Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h1 className="font-display text-2xl font-bold">Template Library</h1>
          </div>
          <div className="relative ml-auto w-72">
            <Input
              placeholder={t(langVal, 'search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8 space-y-10">
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Filter className="h-4 w-4" />
              <span>{filtered.length} templates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.slice(0, 8).map((c) => (
                <Button
                  key={c}
                  variant={category === c ? 'accent' : 'secondary'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setCategory(c)}
                >
                  {c}
                </Button>
              ))}
              <Button variant="secondary" size="sm" className="text-xs">
                + more
              </Button>
            </div>
          </div>

          {category === 'All' && search === '' && (
            <div className="grid md:grid-cols-2 gap-3 mb-10">
              <div className="glass rounded-2xl p-4 cursor-pointer hover:border-[var(--color-accent-3)] transition-all" onClick={() => applyTemplate(featured[0])}>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-[var(--color-warning)]" />
                  <h3 className="font-display font-semibold">Featured — {featured[0]?.name}</h3>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{featured[0]?.style}</p>
              </div>
              <div className="glass rounded-2xl p-4 cursor-pointer hover:border-[var(--color-accent-3)] transition-all" onClick={() => applyTemplate(featured[1])}>
                <div className="flex items-center gap-2 mb-2">
                  <LayoutGrid className="h-4 w-4 text-[var(--color-accent-2)]" />
                  <h3 className="font-display font-semibold">Recommended — {featured[1]?.name}</h3>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{featured[1]?.style}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((tp) => (
              <Tile key={tp.id} tp={tp} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[var(--color-text-muted)] flex justify-center"><Sparkles className="h-6 w-6" /></div>
          )}
        </section>
      </main>
    </div>
  )
}
