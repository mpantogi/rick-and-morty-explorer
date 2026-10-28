export type CharacterKey = `api:${number}` | `hero:${string}`

export function apiKey(id: number): CharacterKey {
  return `api:${id}`
}
