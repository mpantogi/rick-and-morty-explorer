import type { TypedSchema, TypedSchemaError } from 'vee-validate'
import type { z } from 'zod'

// vee-validate names nested fields like `hero.tags[1]`.
function toFieldPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((joined, segment) => {
    if (typeof segment === 'number') return `${joined}[${segment}]`
    return joined ? `${joined}.${String(segment)}` : String(segment)
  }, '')
}

// vee-validate 4 reads only its own TypedSchema, and @vee-validate/zod does not support zod 4.
export function toTypedSchema<TSchema extends z.ZodType>(
  schema: TSchema,
): TypedSchema<z.input<TSchema>, z.output<TSchema>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) return { value: result.data, errors: [] }
      const byPath = new Map<string, TypedSchemaError>()
      for (const issue of result.error.issues) {
        const path = toFieldPath(issue.path)
        const entry = byPath.get(path) ?? { path, errors: [] }
        entry.errors.push(issue.message)
        byPath.set(path, entry)
      }
      return { errors: [...byPath.values()] }
    },
  }
}
