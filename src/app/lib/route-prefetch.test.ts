import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { scheduleRoutePrefetch } from './route-prefetch'

const { loadCharacterPage } = vi.hoisted(() => ({ loadCharacterPage: vi.fn() }))

vi.mock('@/pages/character', () => {
  loadCharacterPage()
  return {}
})

const IDLE_FALLBACK_MS = 2000

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { render: () => null } }],
  })
}

describe('scheduleRoutePrefetch', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('waits for the first navigation, then loads the chunk when the browser is idle', async () => {
    const requestIdleCallback = vi.fn<(callback: () => void) => number>()
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    const prefetch = vi.fn(() => Promise.resolve())
    const router = createTestRouter()

    scheduleRoutePrefetch(router, prefetch)
    expect(requestIdleCallback).not.toHaveBeenCalled()
    await router.push('/')
    await vi.waitFor(() => {
      expect(requestIdleCallback).toHaveBeenCalledOnce()
    })
    expect(prefetch).not.toHaveBeenCalled()

    requestIdleCallback.mock.calls[0]?.[0]()

    expect(prefetch).toHaveBeenCalledOnce()
  })

  it('falls back to a timer where requestIdleCallback is missing (Safari)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const prefetch = vi.fn(() => Promise.resolve())
    const router = createTestRouter()
    expect('requestIdleCallback' in window).toBe(false)

    scheduleRoutePrefetch(router, prefetch)
    await router.push('/')
    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS - 1)
    expect(prefetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(prefetch).toHaveBeenCalledOnce()
  })

  it('ignores a failed prefetch, which the real navigation reports when it happens', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    // A plain function: a vi.fn would observe the returned promise and so handle the rejection.
    let attempts = 0
    const prefetch = () => {
      attempts += 1
      return Promise.reject(new TypeError('Failed to fetch'))
    }
    const router = createTestRouter()

    scheduleRoutePrefetch(router, prefetch)
    await router.push('/')
    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS)
    // Node reports an unhandled rejection once the current task's microtasks have drained.
    await new Promise((resolve) => setImmediate(resolve))
    process.off('unhandledRejection', unhandled)

    expect(attempts).toBe(1)
    expect(unhandled).not.toHaveBeenCalled()
  })

  it('prefetches the character page by default', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const router = createTestRouter()

    scheduleRoutePrefetch(router)
    await router.push('/')
    await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS)
    await vi.dynamicImportSettled()

    expect(loadCharacterPage).toHaveBeenCalledOnce()
  })
})
