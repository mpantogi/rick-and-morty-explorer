import type { LocationQuery } from 'vue-router'

import { type CharacterFilters, FILTER_FIELDS, normalizeFilters } from '@/entities/character'

interface ListQuery {
  filters: CharacterFilters
  page: number
}

export const FIRST_PAGE = 1
// Positive integers without leading zeros: `2.5` would ask the API for a shifted window.
const PAGE_PATTERN = /^[1-9]\d{0,4}$/

// Repeated parameters use the first value, as the API does.
function firstValue(value: LocationQuery[string] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return first ?? undefined
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
