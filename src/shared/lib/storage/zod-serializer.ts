import type { z } from 'zod'

import { reportError } from '../report-error'

interface StorageSerializer<T> {
  read(raw: string): T
  write(value: T): string
}

interface ListSerializerOptions {
  max: number
}

function reportInDev(error: unknown): void {
  if (import.meta.env.DEV) reportError(error, 'storage')
}

function parseStored(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch (error) {
    reportInDev(error)
    return undefined
  }
}

// Validates entry by entry, so one stale or tampered item never wipes the whole list.
export function createZodSerializer<T>(
  itemSchema: z.ZodType<T>,
  { max }: ListSerializerOptions,
): StorageSerializer<T[]> {
  return {
    read(raw) {
      const stored = parseStored(raw)
      if (!Array.isArray(stored)) {
        if (stored !== undefined) reportInDev(new TypeError('Stored value is not a list'))
        return []
      }
      const items: T[] = []
      const seen = new Set<string>()
      for (const candidate of stored) {
        const result = itemSchema.safeParse(candidate)
        if (!result.success) {
          reportInDev(result.error)
          continue
        }
        const identity = JSON.stringify(result.data)
        if (seen.has(identity)) continue
        seen.add(identity)
        items.push(result.data)
        if (items.length === max) break
      }
      return items
    },
    write: (value) => JSON.stringify(value),
  }
}
