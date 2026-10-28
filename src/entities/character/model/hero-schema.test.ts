import { describe, expect, it } from 'vitest'

import { heroInputSchema, heroSchema } from './hero-schema'

const VALID = { name: 'Portal Pete', gender: 'male', image: 'https://example.com/pete.png' }
const URL_MAX = 2048
const SECURE_URL_ERROR = 'Enter a secure image URL starting with https://.'

type Field = keyof typeof VALID

// The form shows the first message of each field, so that is the one under test.
function firstError(field: Field, value: unknown): string | undefined {
  const result = heroInputSchema.safeParse({ ...VALID, [field]: value })
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message
}

describe('heroInputSchema', () => {
  it('accepts a valid hero and trims the text fields', () => {
    const result = heroInputSchema.parse({
      ...VALID,
      name: '  Portal Pete ',
      image: ' https://example.com/pete.png ',
    })

    expect(result).toEqual(VALID)
  })

  it.each([
    ['', 'Enter a name.'],
    ['   ', 'Enter a name.'],
    ['R', 'Use at least 2 characters.'],
    ['R'.repeat(61), 'Use 60 characters or fewer.'],
  ])('rejects the name %j with %j', (name, message) => {
    expect(firstError('name', name)).toBe(message)
  })

  it.each(['Ri', 'R'.repeat(60), ' Ri '])('accepts the name %j', (name) => {
    expect(firstError('name', name)).toBeUndefined()
  })

  it.each([undefined, '', 'robot', 'Male'])('asks to choose a gender for %j', (gender) => {
    expect(firstError('gender', gender)).toBe('Choose a gender.')
  })

  it.each(['female', 'male', 'genderless', 'unknown'])('accepts the gender %s', (gender) => {
    expect(firstError('gender', gender)).toBeUndefined()
  })

  it.each([
    ['', 'Enter an image URL.'],
    ['  ', 'Enter an image URL.'],
    ['javascript:alert(1)', SECURE_URL_ERROR],
    ['ftp://example.com/pete.png', SECURE_URL_ERROR],
    ['http://example.com/pete.png', SECURE_URL_ERROR],
    ['https://localhost/pete.png', SECURE_URL_ERROR],
    ['example.com/pete.png', SECURE_URL_ERROR],
    [`https://example.com/${'a'.repeat(URL_MAX)}`, 'Use a URL of 2,048 characters or fewer.'],
  ])('rejects the image URL %j with %j', (image, message) => {
    expect(firstError('image', image)).toBe(message)
  })

  it('accepts an https image URL of exactly the maximum length', () => {
    const prefix = 'https://example.com/'
    const image = `${prefix}${'a'.repeat(URL_MAX - prefix.length)}`

    expect(firstError('image', image)).toBeUndefined()
  })
})

describe('heroSchema', () => {
  const stored = {
    ...VALID,
    id: '0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d',
    createdAt: '2026-10-28T12:00:00.000Z',
  }

  it('accepts a stored hero with its id and creation time', () => {
    expect(heroSchema.parse(stored)).toEqual(stored)
  })

  it.each([
    ['a missing id', { ...stored, id: undefined }],
    ['an id that is not a uuid', { ...stored, id: 'pete' }],
    ['a creation time that is not ISO', { ...stored, createdAt: 'yesterday' }],
    ['an insecure image', { ...stored, image: 'http://example.com/pete.png' }],
  ])('rejects %s', (_, value) => {
    expect(heroSchema.safeParse(value).success).toBe(false)
  })
})
