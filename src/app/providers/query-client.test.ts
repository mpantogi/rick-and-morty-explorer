import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'

import { createQueryClient } from './query-client'

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
