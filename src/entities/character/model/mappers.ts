import { paths } from '@/shared/config'

import type { ApiCharacter } from '../api/schemas'
import { apiKey } from './character-key'
import type { CharacterGender, CharacterStatus, CharacterView } from './types'

const EPISODE_ID = /\/episode\/(\d+)$/

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

function toEpisodeIds(urls: readonly string[]): number[] {
  return urls.flatMap((url) => {
    const id = EPISODE_ID.exec(url)?.[1]
    return id === undefined ? [] : [Number(id)]
  })
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
    episodeIds: toEpisodeIds(character.episode),
    href: paths.character(character.id),
  }
}
