import { describe, expect, it } from 'vitest'

import { apiKey } from './character-key'

describe('apiKey', () => {
  it('prefixes API ids so they can never collide with created heroes', () => {
    expect(apiKey(1)).toBe('api:1')
    expect(apiKey(826)).toBe('api:826')
  })
})
