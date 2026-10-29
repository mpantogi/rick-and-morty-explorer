import { describe, expect, it } from 'vitest'

import { homeSeo } from './home-seo'

describe('homeSeo', () => {
  it('uses the site title and an indexable canonical home for the plain list', () => {
    expect(homeSeo({ page: 1, isFiltered: false, isOutOfRange: false })).toEqual({
      title: 'Rick and Morty Explorer: Browse Every Character',
      path: '/',
      robots: 'index',
    })
  })

  it('keeps a plain page of the list on the home canonical its served HTML declares', () => {
    expect(homeSeo({ page: 3, isFiltered: false, isOutOfRange: false })).toEqual({
      title: 'Characters – page 3',
      path: '/',
      robots: 'index',
    })
  })

  it.each([1, 4])(
    'folds filtered page %i into the home page and keeps it out of the index',
    (page) => {
      expect(homeSeo({ page, isFiltered: true, isOutOfRange: false })).toEqual({
        title: `Characters – page ${String(page)}`,
        path: '/',
        robots: 'noindex',
      })
    },
  )

  it('folds a page past the last one into the home page and keeps it out of the index', () => {
    expect(homeSeo({ page: 999, isFiltered: false, isOutOfRange: true })).toEqual({
      title: 'Characters – page 999',
      path: '/',
      robots: 'noindex',
    })
  })
})
