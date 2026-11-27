import { useEffect, useMemo, useState } from 'react'
import { Search, Filter, Star, LayoutGrid, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import DesignPreview from '../components/ui/DesignPreview'
import { TEMPLATES } from '../data/templates'
import { applyTemplate } from '../lib/templates'
import { useUI } from '../store/ui'
import { useSettings } from '../store/settings'
import type { Language } from '../lib/i18n'
import { t } from '../lib/i18n'
import type { Template } from '../lib/types'
import { cn } from '../lib/utils'

const CATEGORIES = [
  'All', 'TikTok', 'Canva', 'CapCut', 'Instagram', 'YouTube', 'Reels', 'Shorts', 'Music', 'Cinematic',
  'Business', 'Marketing', 'Education', 'Gaming', 'Sports', 'Fashion', 'Birthday',
  'Event', 'Travel', 'Motivation', 'Quotes', 'Ads',
]

export default function TemplateLibrary() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [featured] = useState(() => TEMPLATES.slice(0, 4))
  const langVal = useSettings((s) => s.language) as Language
  const { setSearchQuery } = useUI()

  useEffect(() => setSearchQuery(''), [setSearchQuery])

  const filtered = useMemo(
    () =>
      TEMPLATES.filter((tp) => {
        const catOk = category === 'All' || tp.category.toLowerCase() === category.toLowerCase()
        // Accept the common misspelling "cupcut" as well as "capcut".
        const s = search.trim().toLowerCase().replace(/cup[\s-]?cut/g, 'capcut')
        const nameOk =
          tp.name.toLowerCase().includes(s) ||
          tp.style.toLowerCase().includes(s) ||
          tp.category.toLowerCase().includes(s) ||
          tp.elements.some((el) => (el.text || '').toLowerCase().includes(s))
        return catOk && (s ? nameOk : true)
      }),
    [search, category],
  )

  const visibleCategories = showAllCategories ? CATEGORIES : CATEGORIES.slice(0, 8)

  const Tile = ({ tp, hero = false }: { tp: Template; hero?: boolean }) => (
    <button
      className={cn(
        'group glass rounded-2xl p-0 text-left hover:border-[var(--color-accent-3)] hover:translate-y-[-3px] transition-all overflow-hidden',
        hero && 'md:col-span-2 lg:col-span-2',
      )}
      onClick={() => void applyTemplate(tp)}
      title={`Open "${tp.name}" in the editor`}
    >
      <div className="relative h-44 bg-[#090A0F]">
        <DesignPreview design={tp} className="absolute inset-0 h-full w-full" />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-3 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition">
          Use template →
        </span>
      </div>
      <div className="p-3 border-t border-[var(--color-border)]">
        <p className="text-sm font-medium truncate">{tp.name}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] truncate">
          {tp.style} · {tp.aspectRatio} · {tp.elements.filter((el) => el.type === 'text').length} text layers
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
              <span>{filtered.length} ready-to-edit templates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((c) => (
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
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => setShowAllCategories((v) => !v)}
              >
                {showAllCategories ? '− less' : '+ more'}
              </Button>
            </div>
          </div>

          {category === 'All' && search === '' && featured[0] && featured[1] && (
            <div className="grid md:grid-cols-2 gap-3 mb-10">
              <button
                className="glass rounded-2xl p-3 flex gap-4 text-left cursor-pointer hover:border-[var(--color-accent-3)] transition-all"
                onClick={() => void applyTemplate(featured[0])}
              >
                <DesignPreview design={featured[0]} className="h-24 w-24 shrink-0 rounded-xl" />
                <div className="min-w-0 py-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-[var(--color-warning)]" />
                    <h3 className="font-display font-semibold truncate">Featured — {featured[0].name}</h3>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{featured[0].style}</p>
                  <p className="text-[10px] text-[var(--color-accent-2)] mt-2">Click to open in editor →</p>
                </div>
              </button>
              <button
                className="glass rounded-2xl p-3 flex gap-4 text-left cursor-pointer hover:border-[var(--color-accent-3)] transition-all"
                onClick={() => void applyTemplate(featured[1])}
              >
                <DesignPreview design={featured[1]} className="h-24 w-24 shrink-0 rounded-xl" />
                <div className="min-w-0 py-1">
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutGrid className="h-4 w-4 text-[var(--color-accent-2)]" />
                    <h3 className="font-display font-semibold truncate">Recommended — {featured[1].name}</h3>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{featured[1].style}</p>
                  <p className="text-[10px] text-[var(--color-accent-2)] mt-2">Click to open in editor →</p>
                </div>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((tp) => (
              <Tile key={tp.id} tp={tp} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[var(--color-text-muted)] flex flex-col items-center gap-3">
              <Sparkles className="h-6 w-6" />
              <p className="text-sm">No template matches that search. Try another word or category.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
