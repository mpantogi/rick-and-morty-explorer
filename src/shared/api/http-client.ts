import type { z } from 'zod'

import { env } from '@/shared/config'

import { ApiError } from './api-error'

const REQUEST_TIMEOUT_MS = 10_000

type Query = Readonly<Record<string, string>>

interface GetJsonOptions<T> {
  path: string
  query?: Query
  schema: z.ZodType<T>
  signal?: AbortSignal
}

interface RequestScope {
  readonly signal: AbortSignal
  failure(error: unknown, fallback: () => ApiError): unknown
  dispose(): void
}

export function buildApiUrl(path: string, query: Query = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== '') params.append(key, value)
  }
  const search = params.toString()
  return search ? `${env.apiBaseUrl}${path}?${search}` : `${env.apiBaseUrl}${path}`
}

// Manual signal chaining: AbortSignal.any is missing in Safari 16.4, inside the build target.
function createRequestScope(callerSignal: AbortSignal | undefined): RequestScope {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const onCallerAbort = () => {
    controller.abort(callerSignal?.reason)
  }
  if (callerSignal?.aborted) onCallerAbort()
  else callerSignal?.addEventListener('abort', onCallerAbort, { once: true })

  return {
    signal: controller.signal,
    failure(error, fallback) {
      // A caller's own abort is not a network failure, so it passes through untouched.
      if (callerSignal?.aborted) return error
      if (timedOut)
        return new ApiError('timeout', `Timed out after ${REQUEST_TIMEOUT_MS} ms`, { cause: error })
      return fallback()
    },
    dispose() {
      clearTimeout(timer)
      callerSignal?.removeEventListener('abort', onCallerAbort)
    },
  }
}

async function send(url: string, scope: RequestScope): Promise<Response> {
  try {
    return await fetch(url, { signal: scope.signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    throw scope.failure(
      error,
      () => new ApiError('network', 'Network request failed', { cause: error }),
    )
  }
}

async function readJson(response: Response, scope: RequestScope): Promise<unknown> {
  try {
    return (await response.json()) as unknown
  } catch (error) {
    throw scope.failure(
      error,
      () =>
        new ApiError('parse', 'Response body is not JSON', {
          status: response.status,
          cause: error,
        }),
    )
  }
}

export async function getJson<T>(options: GetJsonOptions<T>): Promise<T> {
  const { path, query, schema, signal } = options
  const scope = createRequestScope(signal)
  try {
    const response = await send(buildApiUrl(path, query), scope)
    if (!response.ok) {
      throw new ApiError('http', `Request failed with status ${response.status}`, {
        status: response.status,
      })
    }
    const result = schema.safeParse(await readJson(response, scope))
    if (!result.success) {
      throw new ApiError('parse', `Unexpected response shape for ${path}`, {
        status: response.status,
        cause: result.error.issues,
      })
    }
    return result.data
  } finally {
    scope.dispose()
  }
}
