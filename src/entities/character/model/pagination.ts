import type { CharacterView } from './types'

interface Range {
  readonly start: number
  readonly end: number
}

export interface PagePlan {
  readonly local: Range
  readonly api: Range
  readonly apiPages: readonly number[]
}

export interface ApiWindow {
  readonly items: CharacterView[]
  readonly apiCount: number
}

export interface ListPage {
  readonly items: CharacterView[]
  readonly total: number
  readonly totalPages: number
  readonly rangeStart: number
  readonly rangeEnd: number
  readonly outOfRange: boolean
}

export const UI_PAGE_SIZE = 12
const API_PAGE_SIZE = 20

function apiPageOf(index: number): number {
  return Math.floor(index / API_PAGE_SIZE) + 1
}

function apiPagesFor(api: Range): number[] {
  if (api.start === api.end) return []
  const first = apiPageOf(api.start)
  const last = apiPageOf(api.end - 1)
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
}

// Local heroes come first: they take the head of the list and push the API items back.
export function planPage(uiPage: number, localCount: number): PagePlan {
  const start = (uiPage - 1) * UI_PAGE_SIZE
  const end = uiPage * UI_PAGE_SIZE
  const local = { start: Math.min(start, localCount), end: Math.min(end, localCount) }
  const api = { start: Math.max(start - localCount, 0), end: Math.max(end - localCount, 0) }
  return { local, api, apiPages: apiPagesFor(api) }
}

export function sliceApiWindow<T>(
  plan: PagePlan,
  pages: readonly number[],
  results: readonly (readonly T[] | null)[],
): T[] {
  const firstPage = pages[0]
  if (firstPage === undefined) return []
  const offset = plan.api.start - (firstPage - 1) * API_PAGE_SIZE
  return results
    .flatMap((result) => result ?? [])
    .slice(offset, offset + plan.api.end - plan.api.start)
}

export function totalPagesFor(totalItems: number): number {
  return Math.max(1, Math.ceil(totalItems / UI_PAGE_SIZE))
}

export function buildListPage(
  uiPage: number,
  localMatches: readonly CharacterView[],
  apiWindow: ApiWindow,
): ListPage {
  const { local } = planPage(uiPage, localMatches.length)
  const items = [...localMatches.slice(local.start, local.end), ...apiWindow.items]
  const total = localMatches.length + apiWindow.apiCount
  const totalPages = totalPagesFor(total)
  const rangeStart = (uiPage - 1) * UI_PAGE_SIZE + 1
  return {
    items,
    total,
    totalPages,
    rangeStart,
    rangeEnd: rangeStart + items.length - 1,
    outOfRange: total > 0 && uiPage > totalPages,
  }
}
