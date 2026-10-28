import { describe, expect, it } from 'vitest'

import { truncate } from './truncate'

const DESCRIPTION_MAX = 155

describe('truncate', () => {
  it('returns text that fits unchanged', () => {
    expect(truncate('Short description.', DESCRIPTION_MAX)).toBe('Short description.')
  })

  it('returns text of exactly the maximum length unchanged', () => {
    const text = 'a'.repeat(DESCRIPTION_MAX)

    expect(truncate(text, DESCRIPTION_MAX)).toBe(text)
  })

  it('cuts at the last word boundary and counts the ellipsis toward the limit', () => {
    const text = `${'word '.repeat(40)}end`

    const result = truncate(text, DESCRIPTION_MAX)

    expect(result.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(result.endsWith('word…')).toBe(true)
  })

  it('does not leave a trailing space before the ellipsis', () => {
    expect(truncate('alpha beta gamma', 11)).toBe('alpha beta…')
  })

  it('cuts inside a single long word when there is no boundary', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…')
  })
})
