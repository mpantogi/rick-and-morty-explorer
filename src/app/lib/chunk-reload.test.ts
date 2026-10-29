import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { STORAGE_KEYS } from '@/shared/config'

import { routes } from '../router/routes'
import { installChunkReload, isChunkLoadError } from './chunk-reload'
import { scheduleRoutePrefetch } from './route-prefetch'

const RELOAD_GUARD_MS = 10_000
const IDLE_FALLBACK_MS = 2000
const DESTINATION = '/broken?page=2'
const CHUNK_ERROR = new TypeError(
  'Failed to fetch dynamically imported module: https://example.org/assets/x.js',
)

function routerWithBrokenRoute(error: Error): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/broken', component: () => Promise.reject(error) }, ...routes],
  })
}

async function navigateToBrokenRoute(router: Router): Promise<void> {
  await router.push(DESTINATION).catch(() => undefined)
}

// What Vite's preload helper does when a chunk fails: announce it, then reject unless prevented.
function failingPrefetch(): Promise<never> {
  window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
  return Promise.reject(CHUNK_ERROR)
}

describe('installChunkReload', () => {
  let uninstall: () => void = () => undefined
  const loadPage = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    sessionStorage.clear()
  })

  afterEach(() => {
    uninstall()
    vi.useRealTimers()
  })

  it('loads the destination in full when its chunk fails during navigation', async () => {
    const router = routerWithBrokenRoute(CHUNK_ERROR)
    uninstall = installChunkReload(router, loadPage)

    await navigateToBrokenRoute(router)

    expect(loadPage).toHaveBeenCalledExactlyOnceWith(DESTINATION)
    expect(sessionStorage.getItem(STORAGE_KEYS.reloadedAt)).toBe(String(Date.now()))
  })

  it('never reloads for a failed idle prefetch, which leaves the page being read alone', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] })
    const router = routerWithBrokenRoute(CHUNK_ERROR)
    uninstall = installChunkReload(router, loadPage)
    const preloadErrors = vi.fn((event: Event) => event.defaultPrevented)
    window.addEventListener('vite:preloadError', preloadErrors)

    scheduleRoutePrefetch(router, failingPrefetch)
    await router.push('/')
    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS)
    window.removeEventListener('vite:preloadError', preloadErrors)

    expect(preloadErrors).toHaveReturnedWith(false)
    expect(loadPage).not.toHaveBeenCalled()
  })

  it('lets a second failure within 10 s through instead of reloading in a loop', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = routerWithBrokenRoute(CHUNK_ERROR)
    uninstall = installChunkReload(router, loadPage)
    await navigateToBrokenRoute(router)
    vi.advanceTimersByTime(RELOAD_GUARD_MS - 1)

    await navigateToBrokenRoute(router)

    expect(loadPage).toHaveBeenCalledOnce()
    expect(consoleError).toHaveBeenCalledExactlyOnceWith('[navigation]', CHUNK_ERROR)
  })

  it('reloads again once the 10 s guard has passed', async () => {
    const router = routerWithBrokenRoute(CHUNK_ERROR)
    uninstall = installChunkReload(router, loadPage)
    await navigateToBrokenRoute(router)
    vi.advanceTimersByTime(RELOAD_GUARD_MS)

    await navigateToBrokenRoute(router)

    expect(loadPage).toHaveBeenCalledTimes(2)
  })

  it('does not reload when session storage is blocked, because the loop guard cannot work', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const router = routerWithBrokenRoute(CHUNK_ERROR)
    uninstall = installChunkReload(router, loadPage)

    await navigateToBrokenRoute(router)

    expect(loadPage).not.toHaveBeenCalled()
  })

  it('reports navigation errors it does not recover from', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new Error('guard exploded')
    const router = routerWithBrokenRoute(failure)
    uninstall = installChunkReload(router, loadPage)

    await navigateToBrokenRoute(router)

    expect(loadPage).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('[navigation]', failure)
  })
})

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: /assets/a.js',
    'Importing a module script failed.',
    'error loading dynamically imported module: /assets/a.js',
  ])('recognises the browser message "%s"', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true)
  })

  it('ignores other errors and non-errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false)
  })
})
