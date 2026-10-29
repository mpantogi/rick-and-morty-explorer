import { type RemovableRef, useStorage } from '@vueuse/core'
import type { z } from 'zod'

import { reportStorageError } from './storage-feedback'
import { createZodSerializer } from './zod-serializer'

// No storage argument: useStorage then reads localStorage inside a try, so blocked site data
// reaches onError and the list lives in memory (useLocalStorage reads it unguarded).
export function useStoredList<T>(
  key: string,
  itemSchema: z.ZodType<T>,
  max: number,
): RemovableRef<T[]> {
  return useStorage<T[]>(key, [], undefined, {
    serializer: createZodSerializer(itemSchema, { max }),
    writeDefaults: false,
    onError: reportStorageError,
  })
}
