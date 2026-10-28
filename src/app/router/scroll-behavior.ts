import type { LocationQuery, RouterScrollBehavior } from 'vue-router'

import { sameFilters } from '@/entities/character'
import { parseListQuery } from '@/features/character-filters'

const RESULTS = { el: '#results', top: 0 }

// Compares the list each URL shows, so a canonical rewrite (`?page=1` → `/`) never moves the page.
function homeScroll(to: LocationQuery, from: LocationQuery): typeof RESULTS | false {
  const next = parseListQuery(to)
  const previous = parseListQuery(from)
  const isPaging = next.page !== previous.page && sameFilters(next.filters, previous.filters)
  return isPaging ? RESULTS : false
}

/** @returns `false` to keep the current scroll position, per the vue-router contract. */
export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) return savedPosition
  if (to.hash) return { el: to.hash }
  if (to.name === 'home' && from.name === 'home') return homeScroll(to.query, from.query)
  return { top: 0 }
}
