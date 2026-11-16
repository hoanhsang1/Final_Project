import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useSession } from '@/features/auth/hooks'
import { cn } from '@/lib/cn'
import { normalizeForSearch } from '@/lib/format'
import { accessibleWorkspaces, visibleGroups, type PageStatus } from '@/lib/nav'
import { SearchTrigger } from '@/layouts/search-trigger'

interface Entry {
  id: string
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  workspace: string
  group: string
  status: PageStatus
}

/** Bảng tìm nhanh toàn bộ màn hình người dùng được phép thấy. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const session = useSession()

  const entries = useMemo<Entry[]>(() => {
    if (!session) return []
    return accessibleWorkspaces(session).flatMap((workspace) =>
      visibleGroups(session, workspace).flatMap((group) =>
        group.items.map((item) => ({
          id: `${workspace.id}-${item.id}`,
          label: item.label,
          to: item.to,
          icon: item.icon,
          workspace: workspace.shortLabel,
          group: group.label,
          status: item.status,
        })),
      ),
    )
  }, [session])

  const results = useMemo(() => {
    const normalized = normalizeForSearch(query.trim())
    if (!normalized) return entries
    return entries.filter((entry) =>
      normalizeForSearch(`${entry.label} ${entry.group} ${entry.workspace}`).includes(normalized),
    )
  }, [entries, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const go = (entry: Entry | undefined) => {
    if (!entry) return
    setOpen(false)
    navigate(entry.to)
  }

  return (
    <>
      <SearchTrigger onOpen={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          size="lg"
          className="top-[12%] max-w-xl translate-y-0 gap-0 p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Tìm nhanh màn hình</DialogTitle>
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <Search className="size-4 text-ink-400" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActiveIndex((index) => Math.min(index + 1, results.length - 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActiveIndex((index) => Math.max(index - 1, 0))
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  go(results[activeIndex])
                }
              }}
              placeholder="Tìm màn hình, phòng ban, chức năng…"
              aria-label="Tìm nhanh"
              className="h-12 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
            />
            <kbd className="rounded-xs border border-line bg-ink-50 px-1.5 py-0.5 text-2xs text-ink-400">
              ESC
            </kbd>
          </div>

          <div className="mems-scroll max-h-[22rem] overflow-y-auto p-2" role="listbox" aria-label="Kết quả">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-ink-500">
                Không tìm thấy màn hình phù hợp với “{query}”.
              </p>
            ) : (
              results.map((entry, index) => {
                const Icon = entry.icon
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(entry)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors',
                      index === activeIndex ? 'bg-ink-50' : 'hover:bg-ink-50/70',
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-line bg-surface text-ink-500">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-800">
                        {entry.label}
                      </span>
                      <span className="block truncate text-2xs text-ink-400">
                        {entry.workspace} · {entry.group}
                      </span>
                    </span>
                    {entry.status !== 'ready' ? (
                      <span className="shrink-0 rounded-full bg-warning-50 px-1.5 py-0.5 text-2xs text-warning-600">
                        chờ triển khai
                      </span>
                    ) : null}
                    {index === activeIndex ? (
                      <CornerDownLeft className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
