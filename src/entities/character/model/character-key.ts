import { z } from '@/shared/zod'

export type CharacterKey = `api:${number}` | `hero:${string}`

type ParsedKey = { source: 'api'; id: number } | { source: 'hero'; id: string }

// Canonical positive API ids, or a lowercase v4 uuid: exactly the hero ids heroSchema accepts.
const KEY = /^(?:api:[1-9]\d*|hero:[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12})$/
const SEPARATOR = ':'

export function isCharacterKey(value: unknown): value is CharacterKey {
  return typeof value === 'string' && KEY.test(value)
}

export const characterKeySchema = z.custom<CharacterKey>(isCharacterKey)

export function apiKey(id: number): CharacterKey {
  return `api:${id}`
}

export function heroKey(id: string): CharacterKey {
  return `hero:${id}`
}

export function parseCharacterKey(key: CharacterKey): ParsedKey {
  const id = key.slice(key.indexOf(SEPARATOR) + SEPARATOR.length)
  return key.startsWith('api:') ? { source: 'api', id: Number(id) } : { source: 'hero', id }
}
