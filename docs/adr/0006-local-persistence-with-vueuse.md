# 0006. Local persistence with VueUse

Status: accepted

## Context

- There is no backend. Favorites, created heroes and the theme must survive a reload, stay in step
  across tabs and never crash the app when storage is corrupt, tampered with, full or blocked.
- The theme must apply before first paint, so a dark-theme visitor never sees a light flash.

## Decision

- Two Pinia setup stores hold the persisted lists: `useFavoritesStore` (`features/favorites`) and
  `useHeroesStore` (`entities/character`). Both persist through `useStoredList`
  (`shared/lib/storage`), a VueUse `useStorage` with `writeDefaults: false`, so nothing is written
  until the visitor saves something. No storage is passed in: `useStorage` then resolves
  `localStorage` inside a `try`, whereas `useLocalStorage` reads the getter unguarded, which throws
  when the browser blocks site data.
- Keys are versioned (`rme:favorites:v1`, `rme:heroes:v1` in `shared/config/storage-keys.ts`). An
  incompatible shape change bumps the version, so old data is ignored, never misread.
- `createZodSerializer(itemSchema, { max })` validates every read entry by entry: invalid entries
  and duplicates are dropped, the rest are kept up to the cap. Changes from other tabs arrive
  through `storage` events and pass the same serializer.
- Caps live in `shared/config/limits.ts` (500 heroes, 2,000 favorites). The store refuses an
  addition at the cap, and the calling component shows a toast.
- Storage that is blocked, full or failing goes to `reportStorageError` (the console through
  `reportError`, plus a toast); the in-memory state carries on for the visit.
- Favorites store keys, `api:<id>` or `hero:<uuid>`. The favorites page resolves API ids in one
  `/character/[ids]` request and heroes through the heroes store. When the cache already holds
  every saved character (from the list, a character page or the favorites list itself, as after a
  removal), it answers without a request. A key whose character is missing is hidden, never
  deleted.
- The theme is not a store: `useColorMode` writes the literal `'light'` or `'dark'` to `rme:theme`
  (`useDark` would store `'auto'` for a choice that matches the OS) through a `useStorage` ref with
  the same `onError`, and an inline script in `index.html` adds the `dark` class before first paint.
- pinia-plugin-persistedstate is not used: `useStorage`, from a library the app already
  depends on, gives each store a storage-backed ref with a validating serializer and cross-tab
  sync, so the plugin would only add a dependency.

## Consequences

- Data stays in one browser on one device; there is no sync or backup.
- Store state is never part of the prerendered HTML, so these regions render a skeleton there
  (ADR 0001).
- Every stored shape has one schema, shared with the form for heroes (ADR 0005).
- The theme key is read in two places, `useTheme` and the inline script, which must change
  together.
- The favorites page lists every favorite at once, without pagination. Realistic lists are short,
  `MAX_FAVORITES` bounds what storage holds, avatars below the fold load lazily, and each card
  keeps its view object, so a toggle re-renders one card. A list near the cap would render
  hundreds of cards; paging it is the step to take if that ever matters.
