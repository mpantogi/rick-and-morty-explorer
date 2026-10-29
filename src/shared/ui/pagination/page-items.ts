type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

// First, last, current and two gaps, plus one sibling on each side of the current page.
const FIXED_SLOTS = 5
const SIBLINGS = 1
const SLOTS = FIXED_SLOTS + SIBLINGS * 2
// A gap only replaces two or more pages; hiding a single page behind "…" would save nothing.
const MIN_GAP_START = 3

function range(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
}

export function getPageItems(current: number, total: number): PageItem[] {
  if (total <= SLOTS) return range(1, total)

  const windowStart = Math.max(current - SIBLINGS, 1)
  const windowEnd = Math.min(current + SIBLINGS, total)
  const edgeLength = SLOTS - 2
  if (windowStart <= MIN_GAP_START) return [...range(1, edgeLength), 'ellipsis-end', total]
  if (windowEnd >= total - MIN_GAP_START + 1) {
    return [1, 'ellipsis-start', ...range(total - edgeLength + 1, total)]
  }
  return [1, 'ellipsis-start', ...range(windowStart, windowEnd), 'ellipsis-end', total]
}
