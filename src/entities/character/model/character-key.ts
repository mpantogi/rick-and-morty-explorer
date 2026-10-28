import { z } from 'zod'

export type CharacterKey = `api:${number}` | `hero:${string}`

type ParsedKey = { source: 'api'; id: number } | { source: 'hero'; id: string }

// Canonical positive API ids, or the v4 uuid every created hero gets from crypto.randomUUID().
const KEY = /^(?:api:[1-9]\d*|hero:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/
const SEPARATOR = ':'

export function isCharacterKey(value: unknown): value is CharacterKey {
  return typeof value === 'string' && KEY.test(value)
}

export const characterKeySchema = z.custom<CharacterKey>(isCharacterKey)

export function apiKey(id: number): CharacterKey {
  return `api:${id}`
}

export function parseCharacterKey(key: CharacterKey): ParsedKey {
  const id = key.slice(key.indexOf(SEPARATOR) + SEPARATOR.length)
  return key.startsWith('api:') ? { source: 'api', id: Number(id) } : { source: 'hero', id }
}
