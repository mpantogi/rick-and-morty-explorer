import type { HistoryState, LocationQuery } from 'vue-router'

import { type CharacterFilters, FILTER_FIELDS, normalizeFilters } from '@/entities/character'

interface ListQuery {
  filters: CharacterFilters
  page: number
}

export const FIRST_PAGE = 1
// Marks a history entry as reached through a page link, which its URL cannot tell:
// Previous on page 2 and a link to the home page both lead to `/`.
export const PAGE_LINK_STATE = { pageLink: true } as const
// A replace keeps the entry's state, so a rewrite of the URL has to clear the mark itself.
export const NOT_PAGE_LINK_STATE = { pageLink: false } as const
// Positive integers without leading zeros: `2.5` would ask the API for a shifted window.
const PAGE_PATTERN = /^[1-9]\d{0,4}$/

// Repeated parameters use the first value, as the API does.
function firstValue(value: LocationQuery[string] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return first ?? undefined
}

export function isPageLinkEntry(): boolean {
  return (window.history.state as HistoryState | null)?.pageLink === true
}

export function parseListQuery(query: LocationQuery): ListQuery {
  const page = firstValue(query.page)
  return {
    filters: normalizeFilters(
      Object.fromEntries(FILTER_FIELDS.map((field) => [field, firstValue(query[field])])),
    ),
    page: page !== undefined && PAGE_PATTERN.test(page) ? Number(page) : FIRST_PAGE,
  }
}

export function toListQuery(filters: CharacterFilters, page: number): Record<string, string> {
  const query: Record<string, string> = {}
  for (const field of FILTER_FIELDS) {
    if (filters[field] !== '') query[field] = filters[field]
  }
  if (page > FIRST_PAGE) query.page = String(page)
  return query
}
