# 0003. Feature-Sliced Design, enforced by eslint-plugin-boundaries

Status: accepted

## Context

- The assignment rewards a clear architecture, and the project owner asked for Feature-Sliced
  Design enforced by tooling rather than by review.
- Steiger, FSD's own linter, resolves imports through TypeScript's module resolution, which has
  no notion of `.vue` files. Imports of components would go unchecked, and most of this app's
  modules are components.

## Decision

- Layers in `src/` import downward only, in this order: `app`, `pages`, `widgets`, `features`,
  `entities`, `shared`. Slices of one layer never import each other.
- Another layer's slice is imported through its `index.ts`, and `shared` through each segment's
  `index.ts` (`@/shared/ui`, `@/shared/lib`, ...). Inside a slice, imports are relative. A public
  `index.ts` exports only what another slice imports.
- eslint-plugin-boundaries 7.4.0 enforces this in `eslint.config.ts` (`app/fsd-boundaries`),
  resolving the `@/` alias and `.vue` files through eslint-import-resolver-typescript. The policy
  disallows by default and allows each layer its lower layers; two closing rules reject imports
  that bypass a slice's or a segment's `index.ts`.
- `build/eslint-boundaries.test.ts` proves the gate through the ESLint Node API on virtual files:
  shared importing a feature, a feature importing a widget or another feature, an entity importing
  a feature and imports past a public `index.ts` are rejected; public-API imports and external
  packages pass.
- Entities stay independent of features by composition: `CharacterCard` and `CharacterGrid` expose
  an `actions` slot, and the widget or page injects the `FavoriteToggle`.
- Tests, `test/`, `e2e/`, `build/` and `scripts/` sit outside the gate.

## Consequences

- A boundary violation fails in the editor, in the pre-commit hook and in CI, and the proof test
  goes red if a config change weakens the gate.
- Shared code that must load without the rest of its segment needs a segment of its own. The
  configured Zod lives in `shared/zod` because the E2E API mock loads the entity schemas in Node,
  where `shared/lib`'s index would pull in the app's environment (ADR 0004).
- Cross-entity references (FSD's `@x` notation) are not configured; none are needed today.
