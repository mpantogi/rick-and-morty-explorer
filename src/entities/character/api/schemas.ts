import { z } from 'zod'

const httpUrl = z.url({ protocol: /^https?$/ })
const placeRef = z.object({ name: z.string(), url: z.string() })

// z.object strips url/created, which keeps the query cache and the prerendered state small.
export const apiCharacterSchema = z.object({
  id: z.int().positive(),
  name: z.string().min(1),
  status: z.enum(['Alive', 'Dead', 'unknown']),
  species: z.string(),
  type: z.string(),
  gender: z.enum(['Female', 'Male', 'Genderless', 'unknown']),
  origin: placeRef,
  location: placeRef,
  image: httpUrl,
  episode: z.array(httpUrl),
})

export const apiCharacterPageSchema = z.object({
  info: z.object({
    count: z.int().nonnegative(),
    pages: z.int().nonnegative(),
    next: z.string().nullable(),
    prev: z.string().nullable(),
  }),
  results: z.array(apiCharacterSchema),
})

export const apiCharacterListSchema = z.array(apiCharacterSchema)

export type ApiCharacter = z.infer<typeof apiCharacterSchema>
export type ApiCharacterPage = z.infer<typeof apiCharacterPageSchema>
