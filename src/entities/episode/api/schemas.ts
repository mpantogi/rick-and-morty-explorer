import { z } from 'zod'

// z.object strips characters/url/created, which keeps the query cache and the prerendered state small.
export const apiEpisodeSchema = z.object({
  id: z.int().positive(),
  name: z.string(),
  air_date: z.string(),
  episode: z.string().regex(/^S\d{2}E\d{2}$/),
})

export const apiEpisodeListSchema = z.array(apiEpisodeSchema)

export type ApiEpisode = z.infer<typeof apiEpisodeSchema>
