import type { Router } from 'vue-router'
import { toast } from 'vue-sonner'

import { STORAGE_KEYS } from '@/shared/config'
import { reportError } from '@/shared/lib'

const RELOAD_GUARD_MS = 10_000
const CHUNK_ERROR_MESSAGES = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
]

export function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    CHUNK_ERROR_MESSAGES.some((message) => error.message.includes(message))
  )
}

function reloadOnce(load: () => void): boolean {
  try {
    const now = Date.now()
    const lastReload = Number(sessionStorage.getItem(STORAGE_KEYS.reloadedAt) ?? 0)
    if (now - lastReload < RELOAD_GUARD_MS) return false
    sessionStorage.setItem(STORAGE_KEYS.reloadedAt, String(now))
  } catch {
    // Without storage the loop guard cannot work, so the visitor gets the navigation toast instead.
    return false
  }
  load()
  return true
}

// Only a failed navigation reloads, and only online: offline it would swap the working page for the
// browser's error page. A failed prefetch (vite:preloadError) is left alone.
export function installChunkReload(
  router: Router,
  loadPage: (url: string) => void = (url) => {
    location.assign(url)
  },
): () => void {
  return router.onError((error: unknown, to) => {
    const loadDestination = () => {
      // Prefixing the origin keeps a crafted path such as //evil.example on this site.
      loadPage(location.origin + router.resolve(to).href)
    }
    if (navigator.onLine && isChunkLoadError(error) && reloadOnce(loadDestination)) return
    reportError(error, 'navigation')
    toast.error("Couldn't open this page", {
      id: 'navigation-error',
      description: 'Check your connection and try again.',
    })
  })
}
