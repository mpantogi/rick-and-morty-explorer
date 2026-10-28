import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createZodSerializer } from './zod-serializer'

const MAX_ITEMS = 3
const itemSchema = z.object({ id: z.number().int().positive(), name: z.string().trim().min(1) })
const serializer = createZodSerializer(itemSchema, { max: MAX_ITEMS })

describe('createZodSerializer', () => {
  let consoleError = vi.spyOn(console, 'error')

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips a valid list', () => {
    const items = [
      { id: 1, name: 'Rick' },
      { id: 2, name: 'Morty' },
    ]

    expect(serializer.read(serializer.write(items))).toEqual(items)
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('returns the parsed (schema output) values', () => {
    expect(serializer.read('[{"id":1,"name":"  Rick  ","extra":true}]')).toEqual([
      { id: 1, name: 'Rick' },
    ])
  })

  it('falls back to an empty list for corrupt JSON', () => {
    expect(serializer.read('{not json')).toEqual([])
    expect(consoleError).toHaveBeenCalledWith('[storage]', expect.any(SyntaxError))
  })

  it('falls back to an empty list when the stored value is not a list', () => {
    expect(serializer.read('{"id":1,"name":"Rick"}')).toEqual([])
    expect(consoleError).toHaveBeenCalledTimes(1)
  })

  it('drops invalid entries and keeps the valid ones', () => {
    const raw = JSON.stringify([
      { id: 1, name: 'Rick' },
      { id: -4, name: 'Bad' },
      'x',
      { id: 2, name: 'Morty' },
    ])

    expect(serializer.read(raw)).toEqual([
      { id: 1, name: 'Rick' },
      { id: 2, name: 'Morty' },
    ])
    expect(consoleError).toHaveBeenCalledTimes(2)
  })

  it('keeps the first entries when the list is over the cap', () => {
    const raw = JSON.stringify([1, 2, 3, 4, 5].map((id) => ({ id, name: `n${String(id)}` })))

    expect(serializer.read(raw).map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('removes duplicate entries, keeping the first occurrence', () => {
    const items = [
      { id: 2, name: 'Morty' },
      { id: 1, name: 'Rick' },
      { id: 2, name: 'Morty' },
    ]

    expect(serializer.read(JSON.stringify(items))).toEqual(items.slice(0, 2))
  })

  it('stays silent about dropped data outside development builds', () => {
    vi.stubEnv('DEV', false)

    expect(serializer.read('[{"id":0}]')).toEqual([])
    expect(consoleError).not.toHaveBeenCalled()
  })
})
