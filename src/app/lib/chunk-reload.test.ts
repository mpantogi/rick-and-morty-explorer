import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { routes } from '../router/routes'
import { installChunkReload, isChunkLoadError } from './chunk-reload'

const RELOAD_GUARD_MS = 10_000
const CHUNK_ERROR = new TypeError(
  'Failed to fetch dynamically imported module: https://example.org/assets/x.js',
)

function firePreloadError(): Event {
  const event = new Event('vite:preloadError', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

function routerWithBrokenRoute(error: Error): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/broken', component: () => Promise.reject(error) }, ...routes],
  })
}

describe('installChunkReload', () => {
  let uninstall: () => void = () => undefined
  const reload = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    sessionStorage.clear()
  })

  afterEach(() => {
    uninstall()
    vi.useRealTimers()
  })

  it('reloads once on the first stale-chunk error and cancels the default rethrow', () => {
    uninstall = installChunkReload(routerWithBrokenRoute(CHUNK_ERROR), reload)

    const event = firePreloadError()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('lets a second error within 10 s through instead of reloading in a loop', () => {
    uninstall = installChunkReload(routerWithBrokenRoute(CHUNK_ERROR), reload)
    firePreloadError()
    vi.advanceTimersByTime(RELOAD_GUARD_MS - 1)

    const second = firePreloadError()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(second.defaultPrevented).toBe(false)
  })

  it('reloads again once the 10 s guard has passed', () => {
    uninstall = installChunkReload(routerWithBrokenRoute(CHUNK_ERROR), reload)
    firePreloadError()
    vi.advanceTimersByTime(RELOAD_GUARD_MS)

    firePreloadError()

    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('does not reload when session storage is blocked, because the loop guard cannot work', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    uninstall = installChunkReload(routerWithBrokenRoute(CHUNK_ERROR), reload)

    const event = firePreloadError()

    expect(reload).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('reloads when a lazy route chunk fails during navigation', async () => {
    const router = routerWithBrokenRoute(CHUNK_ERROR)
    uninstall = installChunkReload(router, reload)

    await router.push('/broken').catch(() => undefined)

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reports navigation errors it does not recover from', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new Error('guard exploded')
    const router = routerWithBrokenRoute(failure)
    uninstall = installChunkReload(router, reload)

    await router.push('/broken').catch(() => undefined)

    expect(reload).not.toHaveBeenCalled()
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
