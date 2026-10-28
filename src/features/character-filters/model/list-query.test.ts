import { describe, expect, it } from 'vitest'

import type { CharacterFilters } from '@/entities/character'

import { parseListQuery, toListQuery } from './list-query'

const NO_FILTERS: CharacterFilters = { name: '', status: '', species: '', type: '', gender: '' }

describe('parseListQuery', () => {
  it('reads every filter and the page', () => {
    expect(
      parseListQuery({
        name: 'Rick',
        status: 'alive',
        species: 'Human',
        type: 'Parasite',
        gender: 'male',
        page: '3',
      }),
    ).toEqual({
      filters: {
        name: 'Rick',
        status: 'alive',
        species: 'Human',
        type: 'Parasite',
        gender: 'male',
      },
      page: 3,
    })
  })

  it('defaults to no filters on page 1', () => {
    expect(parseListQuery({})).toEqual({ filters: NO_FILTERS, page: 1 })
  })

  it('takes the first value of a repeated parameter, like the API', () => {
    expect(parseListQuery({ name: ['rick', 'morty'], page: ['2', '5'] })).toMatchObject({
      filters: { name: 'rick' },
      page: 2,
    })
  })

  it('ignores a parameter without a value', () => {
    expect(parseListQuery({ name: null, species: [null, 'Alien'] }).filters).toEqual(NO_FILTERS)
  })

  it.each(['0', '-1', 'abc', '2.5', '99999999', '02', ''])('reads page=%j as page 1', (page) => {
    expect(parseListQuery({ page }).page).toBe(1)
  })

  it('drops a status or gender that is not a whole option', () => {
    expect(parseListQuery({ status: 'al', gender: 'fem' }).filters).toEqual(NO_FILTERS)
  })

  it('trims and caps free text', () => {
    expect(parseListQuery({ name: `  ${'x'.repeat(120)}  ` }).filters.name).toBe('x'.repeat(100))
  })
})

describe('toListQuery', () => {
  it('writes the set filters in a fixed order and omits page 1', () => {
    const query = toListQuery(
      { ...NO_FILTERS, gender: 'female', name: 'Summer', species: 'Human' },
      1,
    )

    expect(query).toEqual({ name: 'Summer', species: 'Human', gender: 'female' })
    expect(Object.keys(query)).toEqual(['name', 'species', 'gender'])
  })

  it('adds the page after the filters from page 2 on', () => {
    expect(Object.entries(toListQuery({ ...NO_FILTERS, status: 'dead' }, 2))).toEqual([
      ['status', 'dead'],
      ['page', '2'],
    ])
  })

  it('writes nothing for the unfiltered first page', () => {
    expect(toListQuery(NO_FILTERS, 1)).toEqual({})
  })

  it('round-trips through parseListQuery', () => {
    const filters = {
      name: 'Rick',
      status: 'unknown',
      species: '',
      type: 'Clone',
      gender: '',
    } as const

    expect(parseListQuery(toListQuery(filters, 7))).toEqual({ filters, page: 7 })
  })
})
