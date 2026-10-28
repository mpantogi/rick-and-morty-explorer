import { ApiError } from './api-error'

export type ErrorCase = 'not_found' | 'server' | 'unknown'

const SERVER_STATUSES: ReadonlySet<number> = new Set([429, 500, 502, 503, 504])

export function toErrorCase(error: unknown): ErrorCase {
  if (!(error instanceof ApiError)) return 'unknown'
  if (error.kind === 'parse') return 'server'
  if (error.isNotFound) return 'not_found'
  if (error.status !== undefined && SERVER_STATUSES.has(error.status)) return 'server'
  return 'unknown'
}
