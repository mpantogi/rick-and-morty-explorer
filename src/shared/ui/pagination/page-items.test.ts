import { describe, expect, it } from 'vitest'

import { getPageItems } from './page-items'

const SIBLINGS = 1

describe('getPageItems', () => {
  it.each([1, 2, 7])('lists all %i pages when they fit in seven slots', (total) => {
    expect(getPageItems(1, total, SIBLINGS)).toEqual(
      Array.from({ length: total }, (_, index) => index + 1),
    )
  })

  it.each([1, 4])('opens the start without a gap at page %i', (current) => {
    expect(getPageItems(current, 69, SIBLINGS)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 69])
  })

  it('windows the middle with a gap on each side', () => {
    expect(getPageItems(35, 69, SIBLINGS)).toEqual([
      1,
      'ellipsis-start',
      34,
      35,
      36,
      'ellipsis-end',
      69,
    ])
  })

  it('opens a start gap as soon as more than one page would hide behind it', () => {
    expect(getPageItems(5, 69, SIBLINGS)).toEqual([
      1,
      'ellipsis-start',
      4,
      5,
      6,
      'ellipsis-end',
      69,
    ])
  })

  it.each([66, 69])('closes the end without a gap at page %i', (current) => {
    expect(getPageItems(current, 69, SIBLINGS)).toEqual([1, 'ellipsis-start', 65, 66, 67, 68, 69])
  })

  it('keeps seven slots for any page of a long list', () => {
    for (let current = 1; current <= 69; current += 1) {
      expect(getPageItems(current, 69, SIBLINGS)).toHaveLength(7)
    }
  })

  it('hides two pages behind the only gap of an eight-page list', () => {
    expect(getPageItems(2, 8, SIBLINGS)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 8])
  })
})
