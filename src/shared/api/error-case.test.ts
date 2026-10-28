import { describe, expect, it } from 'vitest'

import { ApiError } from './api-error'
import { toErrorCase } from './error-case'

describe('toErrorCase', () => {
  it.each([
    [404, 'not_found'],
    [429, 'server'],
    [500, 'server'],
    [502, 'server'],
    [503, 'server'],
    [504, 'server'],
    [400, 'unknown'],
    [501, 'unknown'],
  ] as const)('maps HTTP %i to %s', (status, expected) => {
    expect(toErrorCase(new ApiError('http', 'failed', { status }))).toBe(expected)
  })

  it('maps an API contract (parse) failure to the server case', () => {
    expect(toErrorCase(new ApiError('parse', 'bad body', { status: 200 }))).toBe('server')
  })

  it.each(['network', 'timeout'] as const)('maps %s failures to the unknown case', (kind) => {
    expect(toErrorCase(new ApiError(kind, 'offline'))).toBe('unknown')
  })

  it('maps an HTTP error without a status to the unknown case', () => {
    expect(toErrorCase(new ApiError('http', 'no status'))).toBe('unknown')
  })

  it('maps plain errors and non-error values to the unknown case', () => {
    expect(toErrorCase(new Error('render'))).toBe('unknown')
    expect(toErrorCase(undefined)).toBe('unknown')
  })
})
