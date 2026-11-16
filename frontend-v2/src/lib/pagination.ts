/** Danh sách số trang có dấu "…" — dùng cho Pagination. */
export function buildPageList(current: number, total: number, siblings = 1): (number | 'gap')[] {
  if (total <= 0) return []
  const pages = new Set<number>([1, total])
  for (let i = current - siblings; i <= current + siblings; i += 1) {
    if (i >= 1 && i <= total) pages.add(i)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  let previous = 0
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push('gap')
    result.push(page)
    previous = page
  }
  return result
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function rangeLabel(page: number, size: number, total: number): string {
  if (total === 0) return '0 bản ghi'
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)
  return `${from}–${to} trên ${total}`
}
