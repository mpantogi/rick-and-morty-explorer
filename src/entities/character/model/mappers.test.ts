import { describe, expect, it } from 'vitest'

import type { ApiCharacter } from '../api/schemas'
import { displayValue } from './labels'
import { toCharacterView } from './mappers'

const EPISODE = 'https://rickandmortyapi.com/api/episode'

function apiCharacter(overrides: Partial<ApiCharacter> = {}): ApiCharacter {
  return {
    id: 2,
    name: 'Morty Smith',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    origin: { name: 'unknown', url: '' },
    location: { name: 'Citadel of Ricks', url: 'https://rickandmortyapi.com/api/location/3' },
    image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg',
    episode: [`${EPISODE}/1`, `${EPISODE}/2`],
    ...overrides,
  }
}

describe('toCharacterView', () => {
  it('maps an API character onto the view model keyed and linked by its id', () => {
    expect(toCharacterView(apiCharacter())).toEqual({
      key: 'api:2',
      source: 'api',
      name: 'Morty Smith',
      status: 'alive',
      species: 'Human',
      type: '',
      gender: 'male',
      image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg',
      origin: 'unknown',
      location: 'Citadel of Ricks',
      episodeIds: [1, 2],
      href: '/characters/2',
    })
  })

  it.each([
    ['Dead', 'dead'],
    ['unknown', 'unknown'],
  ] as const)('lowercases the %s status', (status, expected) => {
    expect(toCharacterView(apiCharacter({ status })).status).toBe(expected)
  })

  it.each([
    ['Female', 'female'],
    ['Genderless', 'genderless'],
    ['unknown', 'unknown'],
  ] as const)('lowercases the %s gender', (gender, expected) => {
    expect(toCharacterView(apiCharacter({ gender })).gender).toBe(expected)
  })

  it('keeps the subspecies when the API lists one', () => {
    expect(toCharacterView(apiCharacter({ type: 'Parasite' })).type).toBe('Parasite')
  })

  it('reads the episode ids from the end of the episode URLs', () => {
    const view = toCharacterView(apiCharacter({ episode: [`${EPISODE}/7`, `${EPISODE}/51`] }))

    expect(view.episodeIds).toEqual([7, 51])
  })
})

describe('displayValue', () => {
  it.each(['unknown', 'Unknown', 'UNKNOWN', ''])('shows %j as Unknown', (raw) => {
    expect(displayValue(raw)).toBe('Unknown')
  })

  it('shows any other value as it is', () => {
    expect(displayValue('Earth (C-137)')).toBe('Earth (C-137)')
  })
})
