import type { Router } from 'vue-router'

import { reportError } from '@/shared/lib'

const RELOADED_AT_KEY = 'rme:reloaded-at'
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

function reloadOnce(reload: () => void): boolean {
  try {
    const now = Date.now()
    const lastReload = Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0)
    if (now - lastReload < RELOAD_GUARD_MS) return false
    sessionStorage.setItem(RELOADED_AT_KEY, String(now))
  } catch {
    // Without storage the loop guard cannot work, so leave the error to the error UI.
    return false
  }
  reload()
  return true
}

export function installChunkReload(
  router: Router,
  reload: () => void = () => {
    location.reload()
  },
): () => void {
  const onPreloadError = (event: Event) => {
    if (reloadOnce(reload)) event.preventDefault()
  }
  window.addEventListener('vite:preloadError', onPreloadError)
  const removeRouterHandler = router.onError((error: unknown) => {
    if (isChunkLoadError(error) && reloadOnce(reload)) return
    reportError(error, 'navigation')
  })
  return () => {
    window.removeEventListener('vite:preloadError', onPreloadError)
    removeRouterHandler()
  }
}
