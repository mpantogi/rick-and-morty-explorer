import { z } from 'zod'

import { apiCharacterSchema } from '@/entities/character/api/schemas'

// Real API records, ids 1–24 and 266: every status and gender, empty types and unknown places.
import records from './characters.json'

const recordSchema = apiCharacterSchema.extend({ url: z.url(), created: z.iso.datetime() })

type ApiCharacterRecord = z.infer<typeof recordSchema>

export const CHARACTERS: readonly ApiCharacterRecord[] = z.array(recordSchema).parse(records)
