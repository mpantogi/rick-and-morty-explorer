import { paths } from '@/shared/config'

import type { ApiCharacter } from '../api/schemas'
import { apiKey, heroKey } from './character-key'
import type { Hero } from './hero-schema'
import type { CharacterGender, CharacterStatus, CharacterView } from './types'

const STATUS_BY_API = {
  Alive: 'alive',
  Dead: 'dead',
  unknown: 'unknown',
} as const satisfies Record<ApiCharacter['status'], CharacterStatus>

const GENDER_BY_API = {
  Female: 'female',
  Male: 'male',
  Genderless: 'genderless',
  unknown: 'unknown',
} as const satisfies Record<ApiCharacter['gender'], CharacterGender>

// The schema guarantees every episode URL ends in /episode/<id>.
function toEpisodeId(url: string): number {
  return Number(url.slice(url.lastIndexOf('/') + 1))
}

export function toCharacterView(character: ApiCharacter): CharacterView {
  return {
    key: apiKey(character.id),
    source: 'api',
    name: character.name,
    status: STATUS_BY_API[character.status],
    species: character.species,
    type: character.type,
    gender: GENDER_BY_API[character.gender],
    image: character.image,
    origin: character.origin.name,
    location: character.location.name,
    episodeIds: character.episode.map(toEpisodeId),
    href: paths.character(character.id),
  }
}

// The form asks only for name, gender and image; the rest is unknown, as the API itself says.
export function heroToView(hero: Hero): CharacterView {
  return {
    key: heroKey(hero.id),
    source: 'hero',
    name: hero.name,
    status: 'unknown',
    species: 'unknown',
    type: '',
    gender: hero.gender,
    image: hero.image,
    origin: 'unknown',
    location: 'unknown',
    episodeIds: [],
    href: paths.hero(hero.id),
  }
}
