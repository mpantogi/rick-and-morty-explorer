import { describe, expect, it } from 'vitest'

import { formatTitle } from './format-title'

const SUFFIX = ' | Rick and Morty Explorer'
const TITLE_MAX = 60

describe('formatTitle', () => {
  it('adds the site name when the result fits in 60 characters', () => {
    expect(formatTitle('Page not found')).toBe(`Page not found${SUFFIX}`)
  })

  it('keeps the suffix when the result is exactly 60 characters', () => {
    const page = 'x'.repeat(TITLE_MAX - SUFFIX.length)

    expect(formatTitle(page)).toBe(`${page}${SUFFIX}`)
  })

  it('drops the suffix when it would push the title past 60 characters', () => {
    expect(formatTitle('Giant Assassin Hidden in the Statue of Liberty (#758)')).toBe(
      'Giant Assassin Hidden in the Statue of Liberty (#758)',
    )
  })

  it('uses a home title that already names the site verbatim', () => {
    expect(formatTitle('Rick and Morty Explorer: Browse Every Character')).toBe(
      'Rick and Morty Explorer: Browse Every Character',
    )
  })

  it('shortens a page title that is too long on its own to 60 characters with an ellipsis', () => {
    const title = formatTitle(
      'An extremely long custom hero name that keeps going and going (your hero)',
    )

    expect(title).toBe('An extremely long custom hero name that keeps going and…')
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX)
  })
})
