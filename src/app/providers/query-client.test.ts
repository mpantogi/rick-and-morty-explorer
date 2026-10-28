import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import { ApiError } from '@/shared/api'

import { createQueryClient } from './query-client'

const SERVER_TOAST = {
  title: "The Rick and Morty API isn't responding",
  description: "We'll keep what's on screen. Try again in a moment.",
}
const UNKNOWN_TOAST = {
  title: "Couldn't load data",
  description: 'Check your connection and try again.',
}

async function failQuery(error: Error, key = 'failing') {
  const client = createQueryClient()
  await client
    .query({ queryKey: [key], queryFn: () => Promise.reject(error), retry: false })
    .catch(() => undefined)
  return client
}

const GC_TIME_MS = 30 * 60_000

function retryPolicy() {
  const { retry } = createQueryClient().getDefaultOptions().queries ?? {}
  if (typeof retry !== 'function') throw new TypeError('retry must be a predicate')
  return retry
}

describe('createQueryClient', () => {
  it('treats the immutable API data as never stale and keeps it for a session', () => {
    const queries = createQueryClient().getDefaultOptions().queries

    expect(queries).toMatchObject({
      staleTime: 'static',
      gcTime: GC_TIME_MS,
      refetchOnWindowFocus: false,
      networkMode: 'always',
    })
  })

  it('creates an independent client per call so SSG routes never share a cache', () => {
    expect(createQueryClient()).not.toBe(createQueryClient())
  })

  it.each([
    ['a network failure', new ApiError('network', 'offline'), 0, true],
    ['a timeout', new ApiError('timeout', 'slow'), 1, true],
    ['a 503', new ApiError('http', 'down', { status: 503 }), 0, true],
    ['a 429', new ApiError('http', 'busy', { status: 429 }), 1, true],
    ['a retryable error after two retries', new ApiError('network', 'offline'), 2, false],
    ['a 404', new ApiError('http', 'missing', { status: 404 }), 0, false],
    ['a 400', new ApiError('http', 'bad', { status: 400 }), 0, false],
    ['a contract (parse) failure', new ApiError('parse', 'shape', { status: 200 }), 0, false],
    ['a non-API error', new Error('bug'), 0, false],
  ])('retry policy for %s', (_label, error, failureCount, expected) => {
    expect(retryPolicy()(failureCount, error)).toBe(expected)
  })
})

describe('central query error policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('raises one de-duplicated server toast per failure case', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    const client = createQueryClient()
    const serverError = new ApiError('http', 'down', { status: 500 })

    for (const key of ['page-1', 'page-2']) {
      await client
        .query({ queryKey: [key], queryFn: () => Promise.reject(serverError), retry: false })
        .catch(() => undefined)
    }

    expect(toastError).toHaveBeenCalledTimes(2)
    expect(toastError.mock.calls.map(([, options]) => options?.id)).toEqual([
      'query-error:server',
      'query-error:server',
    ])
    expect(toastError).toHaveBeenCalledWith(SERVER_TOAST.title, {
      id: 'query-error:server',
      description: SERVER_TOAST.description,
    })
  })

  it('blames the connection for network failures', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 0)

    await failQuery(new ApiError('network', 'offline'))

    expect(toastError).toHaveBeenCalledWith(UNKNOWN_TOAST.title, {
      id: 'query-error:unknown',
      description: UNKNOWN_TOAST.description,
    })
  })

  it('stays silent for a 404, which regions render as not found or empty', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 0)

    await failQuery(new ApiError('http', 'missing', { status: 404 }))

    expect(toastError).not.toHaveBeenCalled()
  })

  it('stays silent for an aborted request', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 0)

    await failQuery(new DOMException('aborted', 'AbortError'))

    expect(toastError).not.toHaveBeenCalled()
  })

  it('stays silent for a cancelled query', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    const client = createQueryClient()
    const pending = client
      .query({ queryKey: ['slow'], queryFn: () => new Promise<never>(() => undefined) })
      .catch(() => undefined)

    // The default revert: true rethrows before QueryCache.onError; only revert: false reaches it.
    await client.cancelQueries({ queryKey: ['slow'] }, { revert: false })
    await pending

    expect(toastError).not.toHaveBeenCalled()
  })

  it('reports an API contract failure with its issues before toasting the server case', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const drift = new ApiError('parse', 'shape', { status: 200, cause: [{ path: ['status'] }] })

    await failQuery(drift)

    expect(consoleError).toHaveBeenCalledWith('[api-contract]', drift)
    expect(toastError).toHaveBeenCalledWith(SERVER_TOAST.title, expect.anything())
  })

  it('never toasts while prerendering', async () => {
    vi.stubEnv('SSR', true)
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 0)

    await failQuery(new ApiError('http', 'down', { status: 503 }))

    expect(toastError).not.toHaveBeenCalled()
  })
})
