import type { Router } from 'vue-router'

import { ignorePrefetchError } from '@/shared/lib'

// Safari has no requestIdleCallback; by then the first page has long finished loading.
const IDLE_FALLBACK_MS = 2000

function whenIdle(task: () => void): void {
  if ('requestIdleCallback' in window) requestIdleCallback(task)
  else setTimeout(task, IDLE_FALLBACK_MS)
}

// A character page is the likeliest next stop, so its chunk loads while the browser is idle.
export function scheduleRoutePrefetch(
  router: Router,
  prefetch: () => Promise<unknown> = () => import('@/pages/character'),
): void {
  router.isReady().then(() => {
    whenIdle(() => {
      prefetch().catch(ignorePrefetchError)
    })
  }, ignorePrefetchError)
}
