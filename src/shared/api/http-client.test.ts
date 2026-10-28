import { http, HttpResponse } from 'msw/http'
import { delay } from 'msw/utils/delay'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { server } from '../../../test/msw/server'
import { ApiError } from './api-error'
import { buildApiUrl, getJson } from './http-client'

const API = 'https://rickandmortyapi.com/api'
const DEFAULT_TIMEOUT_MS = 10_000
const itemSchema = z.object({ id: z.number() })

function respondWith(resolver: () => Response | Promise<Response>) {
  server.use(http.get(`${API}/character/:id`, resolver))
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the request to fail')
}

describe('buildApiUrl', () => {
  it('appends the path to the API base URL and keeps bracket id lists intact', () => {
    expect(buildApiUrl('/character/[1,2]')).toBe(`${API}/character/[1,2]`)
  })

  it('encodes the query in insertion order and drops empty values', () => {
    expect(buildApiUrl('/character', { name: 'rick sanchez', status: '', page: '2' })).toBe(
      `${API}/character?name=rick+sanchez&page=2`,
    )
  })
})

describe('getJson', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the schema-parsed body of a successful response', async () => {
    respondWith(() => HttpResponse.json({ id: 1, url: 'stripped' }))

    await expect(getJson({ path: '/character/1', schema: itemSchema })).resolves.toEqual({ id: 1 })
  })

  it('requests the bracket path and query exactly as built', async () => {
    let requestedUrl = ''
    server.use(
      http.get(`${API}/character/:ids`, ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json({ id: 1 })
      }),
    )

    await getJson({
      path: '/character/[1,2]',
      query: { page: '', name: 'rick' },
      schema: itemSchema,
    })

    expect(requestedUrl).toBe(`${API}/character/[1,2]?name=rick`)
  })

  it('turns a 404 into a non-retryable not-found ApiError', async () => {
    respondWith(() => HttpResponse.json({ error: 'Character not found' }, { status: 404 }))

    const error = await captureError(getJson({ path: '/character/9', schema: itemSchema }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 404, isNotFound: true, isRetryable: false })
  })

  it.each([429, 500, 503])('marks HTTP %i as retryable', async (status) => {
    respondWith(() => HttpResponse.json({ error: 'boom' }, { status }))

    const error = await captureError(getJson({ path: '/character/1', schema: itemSchema }))

    expect(error).toMatchObject({ kind: 'http', status, isNotFound: false, isRetryable: true })
  })

  it('does not retry other client errors', async () => {
    respondWith(() => HttpResponse.json({ error: 'bad' }, { status: 400 }))

    const error = await captureError(getJson({ path: '/character/1', schema: itemSchema }))

    expect(error).toMatchObject({ kind: 'http', status: 400, isRetryable: false })
  })

  it('reports a failed connection as a retryable network error', async () => {
    respondWith(() => HttpResponse.error())

    const error = await captureError(getJson({ path: '/character/1', schema: itemSchema }))

    expect(error).toMatchObject({ kind: 'network', status: undefined, isRetryable: true })
  })

  it('reports a body that breaks the schema as a parse error carrying the issues', async () => {
    respondWith(() => HttpResponse.json({ id: 'one' }))

    const error = await captureError(getJson({ path: '/character/1', schema: itemSchema }))

    expect(error).toMatchObject({ kind: 'parse', status: 200, isRetryable: false })
    expect((error as ApiError).cause).toEqual([expect.objectContaining({ path: ['id'] })])
  })

  it('reports a body that is not JSON as a parse error', async () => {
    respondWith(() => HttpResponse.text('<html>', { headers: { 'Content-Type': 'text/html' } }))

    const error = await captureError(getJson({ path: '/character/1', schema: itemSchema }))

    expect(error).toMatchObject({ kind: 'parse', status: 200 })
  })

  it('rethrows the caller abort reason so the cancellation is not reported as a failure', async () => {
    respondWith(async () => {
      await delay('infinite')
      return HttpResponse.json({ id: 1 })
    })
    const controller = new AbortController()

    const request = getJson({ path: '/character/1', schema: itemSchema, signal: controller.signal })
    controller.abort()

    const error = await captureError(request)
    expect(error).toBe(controller.signal.reason)
    expect(error).not.toBeInstanceOf(ApiError)
  })

  it('fails fast when the caller signal is already aborted', async () => {
    respondWith(() => HttpResponse.json({ id: 1 }))
    const controller = new AbortController()
    controller.abort()

    const error = await captureError(
      getJson({ path: '/character/1', schema: itemSchema, signal: controller.signal }),
    )

    expect(error).toBe(controller.signal.reason)
  })

  it('aborts a request that exceeds the default timeout with a retryable timeout error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    respondWith(async () => {
      await delay('infinite')
      return HttpResponse.json({ id: 1 })
    })

    const request = captureError(getJson({ path: '/character/1', schema: itemSchema }))
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS)

    expect(await request).toMatchObject({ kind: 'timeout', isRetryable: true })
  })
})
