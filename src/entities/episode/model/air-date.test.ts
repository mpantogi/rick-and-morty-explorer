import { describe, expect, it } from 'vitest'

import { parseAirDate } from './air-date'

describe('parseAirDate', () => {
  it.each([
    ['December 2, 2013', '2013-12-02'],
    ['September 5, 2021', '2021-09-05'],
    ['April 10, 2014', '2014-04-10'],
  ])('turns %s into the ISO date %s', (airDate, iso) => {
    expect(parseAirDate(airDate)).toBe(iso)
  })

  it.each(['', 'unknown', 'Dec 2, 2013', '2 December 2013', 'February 30, 2020', 'May 0, 2020'])(
    'returns null for %j, which is not a real "Month D, YYYY" date',
    (airDate) => {
      expect(parseAirDate(airDate)).toBeNull()
    },
  )
})
