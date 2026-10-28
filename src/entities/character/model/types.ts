import type { CharacterKey } from './character-key'

export const STATUSES = ['alive', 'dead', 'unknown'] as const
export const GENDERS = ['female', 'male', 'genderless', 'unknown'] as const
export const KNOWN_SPECIES = [
  'Human',
  'Alien',
  'Humanoid',
  'Animal',
  'Robot',
  'Mythological Creature',
  'Poopybutthole',
  'Cronenberg',
  'Disease',
  'unknown',
] as const

export type CharacterStatus = (typeof STATUSES)[number]
export type CharacterGender = (typeof GENDERS)[number]

export interface CharacterView {
  readonly key: CharacterKey
  readonly source: 'api' | 'hero'
  readonly name: string
  readonly status: CharacterStatus
  readonly species: string
  readonly type: string // '' when the API lists no subspecies
  readonly gender: CharacterGender
  readonly image: string
  // Raw place names: the API's own 'unknown' stays so filters match it like the API does.
  readonly origin: string
  readonly location: string
  readonly episodeIds: readonly number[]
  readonly href: string
}

export interface CharacterFilters {
  name: string
  status: CharacterStatus | ''
  species: string
  type: string
  gender: CharacterGender | ''
}
