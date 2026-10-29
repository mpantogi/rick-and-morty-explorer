import { describe, expect, it } from 'vitest'

import {
  apiKey,
  characterKeySchema,
  heroKey,
  isCharacterKey,
  parseCharacterKey,
} from './character-key'
import { heroSchema } from './hero-schema'

const HERO_KEY = 'hero:0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d'

describe('apiKey', () => {
  it('prefixes API ids so they can never collide with created heroes', () => {
    expect(apiKey(1)).toBe('api:1')
    expect(apiKey(826)).toBe('api:826')
  })
})

describe('heroKey', () => {
  it('prefixes a created hero uuid into a valid key', () => {
    const key = heroKey('0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d')

    expect(key).toBe(HERO_KEY)
    expect(isCharacterKey(key)).toBe(true)
  })
})

describe('isCharacterKey', () => {
  it.each(['api:1', 'api:826', HERO_KEY])('accepts %s', (key) => {
    expect(isCharacterKey(key)).toBe(true)
  })

  it.each(['api:0', 'api:01', 'api:-1', 'api:1.5', 'api:', 'hero:x', 'hero:', 'x:1', '1', 1, null])(
    'rejects %j',
    (key) => {
      expect(isCharacterKey(key)).toBe(false)
    },
  )

  it.each([
    ['a lowercase v4 uuid', '0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d'],
    ['a uuid that is not version 4', '0b4f3a52-8f1e-1a5b-9c7d-2e6f1a3b4c5d'],
    ['a v4 uuid with another variant', '0b4f3a52-8f1e-4a5b-7c7d-2e6f1a3b4c5d'],
    ['an uppercase v4 uuid', '0B4F3A52-8F1E-4A5B-9C7D-2E6F1A3B4C5D'],
  ])('takes %s as a hero key exactly when the hero schema takes it as an id', (_, id) => {
    expect(isCharacterKey(heroKey(id))).toBe(heroSchema.shape.id.safeParse(id).success)
  })

  it('backs the schema that validates stored keys', () => {
    expect(characterKeySchema.safeParse('api:2').success).toBe(true)
    expect(characterKeySchema.safeParse('api:02').success).toBe(false)
  })
})

describe('parseCharacterKey', () => {
  it('splits an API key into its numeric id', () => {
    expect(parseCharacterKey(apiKey(42))).toEqual({ source: 'api', id: 42 })
  })

  it('splits a hero key into its uuid', () => {
    expect(parseCharacterKey(heroKey('0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d'))).toEqual({
      source: 'hero',
      id: '0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d',
    })
  })
})
