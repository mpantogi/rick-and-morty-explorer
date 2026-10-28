import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { toTypedSchema } from './to-typed-schema'

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').min(2, 'Use at least 2 characters.'),
  email: z.email('Enter an email address.'),
})

// Values come from the DOM, so these tests also feed shapes the schema's input type rules out.
function parseUntyped(schema: z.ZodType, values: unknown) {
  return toTypedSchema(schema).parse(values)
}

describe('toTypedSchema', () => {
  it('marks itself as a vee-validate typed schema', () => {
    expect(toTypedSchema(profileSchema).__type).toBe('VVTypedSchema')
  })

  it('returns the parsed output and no errors for valid values', async () => {
    const result = await toTypedSchema(profileSchema).parse({
      name: '  Rick  ',
      email: 'rick@example.com',
    })

    expect(result).toEqual({ value: { name: 'Rick', email: 'rick@example.com' }, errors: [] })
  })

  it('groups every message of one field under its path, in schema order', async () => {
    const result = await toTypedSchema(profileSchema).parse({ name: ' ', email: 'nope' })

    expect(result.value).toBeUndefined()
    expect(result.errors).toEqual([
      { path: 'name', errors: ['Enter a name.', 'Use at least 2 characters.'] },
      { path: 'email', errors: ['Enter an email address.'] },
    ])
  })

  it('writes nested paths the way vee-validate names fields', async () => {
    const schema = z.object({ hero: z.object({ tags: z.array(z.string().min(2, 'Too short.')) }) })

    const result = await toTypedSchema(schema).parse({ hero: { tags: ['ok', 'x'] } })

    expect(result.errors).toEqual([{ path: 'hero.tags[1]', errors: ['Too short.'] }])
  })

  it('reports a failed union as an error instead of throwing', async () => {
    const schema = z.object({ id: z.union([z.string(), z.number()], { error: 'Pick one.' }) })

    const result = await parseUntyped(schema, { id: true })

    expect(result.errors).toEqual([{ path: 'id', errors: ['Pick one.'] }])
  })

  it('reports a problem with the whole value under the empty path', async () => {
    const result = await parseUntyped(profileSchema, null)

    expect(result.errors).toEqual([{ path: '', errors: [expect.any(String)] }])
  })
})
