import { describe, expect, it } from 'vitest'

import { homeSeo } from './home-seo'

describe('homeSeo', () => {
  it('uses the site title and an indexable canonical home for the plain list', () => {
    expect(homeSeo({ page: 1, isFiltered: false })).toEqual({
      title: 'Rick and Morty Explorer: Browse Every Character',
      path: '/',
      robots: 'index',
    })
  })

  it('indexes a plain page of the list under its own URL', () => {
    expect(homeSeo({ page: 3, isFiltered: false })).toEqual({
      title: 'Characters – page 3',
      path: '/?page=3',
      robots: 'index',
    })
  })

  it.each([1, 4])(
    'folds filtered page %i into the home page and keeps it out of the index',
    (page) => {
      expect(homeSeo({ page, isFiltered: true })).toEqual({
        title: `Characters – page ${String(page)}`,
        path: '/',
        robots: 'noindex',
      })
    },
  )
})
