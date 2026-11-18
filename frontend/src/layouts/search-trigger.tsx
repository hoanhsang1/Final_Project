import { Search } from 'lucide-react'
import { useEffect } from 'react'

/** Nút mở bảng tìm nhanh kèm phím tắt ⌘K / Ctrl+K. */
export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-xs text-ink-400 shadow-xs transition-colors hover:border-ink-300 hover:text-ink-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
      aria-label="Tìm nhanh màn hình (Ctrl hoặc Cmd + K)"
    >
      <Search className="size-4" aria-hidden="true" />
      <span className="hidden md:inline">Tìm nhanh</span>
      <kbd className="ml-2 hidden rounded-xs border border-line bg-ink-50 px-1.5 py-0.5 text-2xs font-medium text-ink-500 md:inline">
        ⌘K
      </kbd>
    </button>
  )
}
