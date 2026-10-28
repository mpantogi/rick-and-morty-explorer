import type { LocationQuery, RouterScrollBehavior } from 'vue-router'

const PAGE_PARAM = 'page'

function filterSignature(query: LocationQuery): string {
  const filters = Object.entries(query).filter(([key]) => key !== PAGE_PARAM)
  filters.sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(filters)
}

/** @returns `false` to keep the current scroll position, per the vue-router contract. */
export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) return savedPosition
  if (to.hash) return { el: to.hash }
  if (to.name === 'home' && from.name === 'home') {
    return filterSignature(to.query) === filterSignature(from.query)
      ? { el: '#results', top: 0 }
      : false
  }
  return { top: 0 }
}
