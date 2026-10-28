export type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

// First, last, current and two gaps; the siblings flank the current page.
const FIXED_SLOTS = 5
// A gap only replaces two or more pages; hiding a single page behind "…" would save nothing.
const MIN_GAP_START = 3

function range(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
}

export function getPageItems(current: number, total: number, siblings: number): PageItem[] {
  const slots = FIXED_SLOTS + siblings * 2
  if (total <= slots) return range(1, total)

  const windowStart = Math.max(current - siblings, 1)
  const windowEnd = Math.min(current + siblings, total)
  const edgeLength = slots - 2
  if (windowStart <= MIN_GAP_START) return [...range(1, edgeLength), 'ellipsis-end', total]
  if (windowEnd >= total - MIN_GAP_START + 1) {
    return [1, 'ellipsis-start', ...range(total - edgeLength + 1, total)]
  }
  return [1, 'ellipsis-start', ...range(windowStart, windowEnd), 'ellipsis-end', total]
}
