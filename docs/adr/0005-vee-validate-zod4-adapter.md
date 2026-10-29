# 0005. vee-validate with a local Zod 4 adapter

Status: accepted

## Context

- The create-hero form (name, gender, image URL) needs field-level validation with accessible
  errors. The task suggests Vuelidate or VeeValidate; the project uses VeeValidate.
- Zod 4 already validates API responses, and a created hero is validated twice: when the form is
  submitted and whenever it is read back from storage. One schema should serve both.
- vee-validate 4.15.1, the latest stable release, accepts only its own `TypedSchema`. It does not
  read Standard Schema, and `@vee-validate/zod` does not work with Zod 4 (upstream issue #5151).

## Decision

- `toTypedSchema` (`src/shared/lib/validation/to-typed-schema.ts`, unit-tested) adapts any Zod
  schema to vee-validate's `TypedSchema`: it runs `safeParseAsync` and groups the issues by field
  path in vee-validate's notation (`hero.tags[1]`).
- `heroInputSchema` (`src/entities/character/model/hero-schema.ts`) drives the form. `heroSchema`
  extends it with the id and creation date and validates every stored hero. Its key order follows
  the form, so a failed submit focuses the first invalid field.
- Image URLs are `https:` only, and the live preview validates with the same field schema
  (`heroInputSchema.shape.image`).
- Errors appear once a field has been left or the form submitted (`validateOnceTouched`), never
  while the visitor is still typing. Each error is wired to its control with `aria-invalid`,
  `aria-describedby` and `aria-errormessage`, through `BaseField`'s slot props for the text
  fields.

## Consequences

- The form and storage cannot disagree about what a valid hero is.
- The adapter is about 30 lines of local code to maintain, and `@vee-validate/zod` must never be
  added while it is broken on Zod 4.
- Exit: once vee-validate 5 with Standard Schema support is stable, pass the Zod schema directly
  and delete the adapter and its tests.
