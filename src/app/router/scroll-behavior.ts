import type { RouterScrollBehavior } from 'vue-router'

import { isPageLinkEntry } from '@/features/character-filters'

const RESULTS = { el: '#results', top: 0 }

/** @returns `false` to keep the current scroll position, per the vue-router contract. */
export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) return savedPosition
  if (to.hash) return { el: to.hash }
  if (to.name === 'home' && from.name === 'home') {
    // A link to the open page writes no new state, so it still reads this entry's mark.
    return to.fullPath !== from.fullPath && isPageLinkEntry() ? RESULTS : false
  }
  return { top: 0 }
}
