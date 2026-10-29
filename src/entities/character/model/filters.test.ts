import { describe, expect, it } from 'vitest'

import {
  countActiveFilters,
  EMPTY_FILTERS,
  matchesFilters,
  normalizeFilters,
  sameFilters,
  toApiParams,
} from './filters'
import type { CharacterFilters } from './types'

const morty = {
  name: 'Morty Smith',
  status: 'alive',
  species: 'Human',
  type: '',
  gender: 'male',
}

function filters(overrides: Partial<CharacterFilters>): CharacterFilters {
  return { ...EMPTY_FILTERS, ...overrides }
}

describe('normalizeFilters', () => {
  it('trims text and keeps its case', () => {
    expect(
      normalizeFilters({ name: '  Rick Sanchez ', species: ' Alien', type: 'Parasite  ' }),
    ).toEqual({ name: 'Rick Sanchez', status: '', species: 'Alien', type: 'Parasite', gender: '' })
  })

  it('caps text at 100 characters', () => {
    expect(normalizeFilters({ name: 'a'.repeat(150) }).name).toHaveLength(100)
  })

  it('accepts status and gender only as whole enum values, in any case', () => {
    expect(normalizeFilters({ status: 'Alive', gender: ' GENDERLESS ' })).toMatchObject({
      status: 'alive',
      gender: 'genderless',
    })
    expect(normalizeFilters({ status: 'al', gender: 'mal' })).toMatchObject({
      status: '',
      gender: '',
    })
  })

  it('turns missing or non-text values into no filter', () => {
    expect(normalizeFilters({ name: ['rick'], status: 1, species: null })).toEqual(EMPTY_FILTERS)
  })
})

describe('toApiParams', () => {
  it('lowercases values in a fixed order and drops empty ones', () => {
    const params = toApiParams(
      filters({ gender: 'female', name: ' Summer ', type: '', species: 'Human' }),
    )

    expect(params).toEqual({ name: 'summer', species: 'human', gender: 'female' })
    expect(Object.keys(params)).toEqual(['name', 'species', 'gender'])
  })

  it('sends no parameters without filters', () => {
    expect(toApiParams(EMPTY_FILTERS)).toEqual({})
  })
})

describe('matchesFilters', () => {
  it('matches every character when no filter is set', () => {
    expect(matchesFilters(morty, EMPTY_FILTERS)).toBe(true)
  })

  it('matches the name as a case-insensitive substring', () => {
    expect(matchesFilters(morty, filters({ name: 'TY sm' }))).toBe(true)
    expect(matchesFilters(morty, filters({ name: 'smith morty' }))).toBe(false)
  })

  it('anchors gender=male the way the API does, so it never matches female', () => {
    expect(matchesFilters({ ...morty, gender: 'female' }, filters({ gender: 'male' }))).toBe(false)
    expect(matchesFilters(morty, filters({ gender: 'male' }))).toBe(true)
  })

  it('matches Humanoid for species=human, like the API', () => {
    expect(matchesFilters({ ...morty, species: 'Humanoid' }, filters({ species: 'human' }))).toBe(
      true,
    )
  })

  it('treats whitespace-only filters as no filter', () => {
    expect(matchesFilters(morty, filters({ name: '   ', type: ' ' }))).toBe(true)
  })

  it("matches the API's lowercase unknown status", () => {
    const hero = { ...morty, status: 'unknown', species: 'unknown' }

    expect(matchesFilters(hero, filters({ status: 'unknown' }))).toBe(true)
    expect(matchesFilters(hero, filters({ status: 'alive' }))).toBe(false)
  })

  it('requires every set filter to match', () => {
    expect(matchesFilters(morty, filters({ name: 'morty', status: 'dead' }))).toBe(false)
  })
})

describe('countActiveFilters', () => {
  it('counts the filters that are set', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)
    expect(countActiveFilters(filters({ name: 'rick', status: 'alive', type: '  ' }))).toBe(2)
  })

  it('counts only the fields it is given', () => {
    const applied = filters({ name: 'rick', status: 'alive', gender: 'male' })

    expect(countActiveFilters(applied, ['status', 'species', 'type', 'gender'])).toBe(2)
    expect(countActiveFilters(filters({ name: 'rick' }), ['status', 'gender'])).toBe(0)
  })
})

describe('sameFilters', () => {
  it('compares every field exactly', () => {
    expect(sameFilters(filters({ name: 'rick' }), filters({ name: 'rick' }))).toBe(true)
    expect(sameFilters(filters({ name: 'rick' }), filters({ name: 'Rick' }))).toBe(false)
    expect(sameFilters(filters({ gender: 'male' }), EMPTY_FILTERS)).toBe(false)
  })
})
