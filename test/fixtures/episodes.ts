import { z } from 'zod'

import { apiEpisodeSchema } from '@/entities/episode/api/schemas'

// Real API records: episodes 1, 3, 10, 22 and 28, which cover several fixture characters fully.
import records from './episodes.json'

const recordSchema = apiEpisodeSchema.extend({
  characters: z.array(z.url()),
  url: z.url(),
  created: z.iso.datetime(),
})

type ApiEpisodeRecord = z.infer<typeof recordSchema>

export const EPISODES: readonly ApiEpisodeRecord[] = z.array(recordSchema).parse(records)
