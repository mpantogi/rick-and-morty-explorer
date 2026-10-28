# Rick and Morty Explorer

A Vue 3 app for browsing the characters of Rick and Morty through the public
[Rick and Morty API](https://rickandmortyapi.com): search and filter the character list, open a
character's page, save favorites and create a hero of your own. Pages are statically generated with
vite-ssg. Unofficial fan project.

Live site: https://rickverse-explorer.netlify.app (deploying soon).

## Project status

In progress. In place: the app shell, theme, error pages, the `Base*` design system, the
character list (12 characters per page over the API's 20-item pages, URL-synced filters,
pagination, and loading, empty and error states), character detail pages (profile and episode
list), favorites (saved in this browser, listed on their own page) and the create-hero form (name,
gender and an https image URL with a live preview, saved in this browser). Created heroes lead the
character list and follow its filters. Next: a page for each created hero.

## Tech stack

- Vue 3.5.44 with `<script setup>` and the Composition API
- Vue Router 5.4.0, Pinia 4.1.0, TanStack Vue Query 5.105.0, VueUse 15.0.0
- Zod 4.6.7, vue-sonner 2.0.9 (toasts), @unhead/vue 2.1.17 (head tags), @lucide/vue 1.62.0 (icons)
- vee-validate 4.15.1 (forms), fed by the Zod schemas through a small local adapter
- Vite 8.3.5 with vite-ssg 28.3.0, TypeScript 6.0.3, vue-tsc 3.3.13
- Tailwind CSS 4.3.3
- Vitest 5.0.5, Testing Library for Vue 8.1.0, MSW 3.0.3, jsdom 29.1.1
- Playwright 1.64.1 with @axe-core/playwright 4.14.0
- ESLint 10.13.0 (eslint-plugin-boundaries 7.4.0 enforces the layer rules), Prettier 3.9.10
- simple-git-hooks 2.14.0 and lint-staged 17.6.0 for the pre-commit check
- Yarn 4.18.1 on Node 24

Every dependency is pinned to an exact version. `@lucide/vue` stays on 1.62.0 for now: Yarn 4.18's
one-day `npmMinimalAgeGate` refuses 1.63.0 (published 2026-10-28T06:11Z) until 2026-10-29T06:12Z.

## Prerequisites

- Node 24 (see `.nvmrc`)
- Corepack, which ships with Node 24. Run `corepack enable` once so `yarn` resolves to the Yarn
  version pinned in `package.json`.

## Setup

```sh
corepack enable
yarn install
yarn dev
```

`yarn install` also installs a git pre-commit hook that runs ESLint and Prettier on the staged files.

## Scripts

| Command               | What it does                                                         |
| --------------------- | -------------------------------------------------------------------- |
| `yarn dev`            | Start the Vite dev server                                            |
| `yarn build`          | Prerender every page into `dist/` with vite-ssg (calls the live API) |
| `yarn preview`        | Serve `dist/` with Netlify-style routing (real 404s) on port 4173    |
| `yarn test`           | Run the unit and integration tests once                              |
| `yarn test:watch`     | Run the tests in watch mode                                          |
| `yarn test:coverage`  | Run the tests with coverage thresholds                               |
| `yarn test:e2e`       | Run the Playwright suite against the built `dist/` (build first)     |
| `yarn record:fixture` | Re-record the E2E API fixture from the live API (two requests)       |
| `yarn lint`           | ESLint with zero warnings allowed                                    |
| `yarn lint:fix`       | ESLint with autofix                                                  |
| `yarn typecheck`      | Type-check every project with `vue-tsc --build`                      |
| `yarn format`         | Format the repo with Prettier                                        |
| `yarn format:check`   | Check formatting without writing                                     |

The end-to-end tests need a build and a browser:

```sh
yarn build
yarn playwright install chromium
yarn test:e2e --project=chromium
```

`yarn build` loads every character and episode from the live API in three bulk requests and
prerenders one page per character, with its data embedded. If the API is down, the build fails
rather than publishing broken pages.

The E2E suite never calls the live API: every request to it is answered from
`e2e/support/api-fixture.json`, a recording of characters 1–60 and their episodes. Refresh it with
`yarn record:fixture` and commit the result.

## Configuration

Both variables are optional. Their defaults live in `src/shared/config/env.ts`; the build and the
app fail fast if either is not an `https:` URL. Set them in the shell or in an untracked
`.env.local`.

| Variable            | Default                                  | Used for                               |
| ------------------- | ---------------------------------------- | -------------------------------------- |
| `VITE_SITE_URL`     | `https://rickverse-explorer.netlify.app` | Canonical URLs and social preview tags |
| `VITE_API_BASE_URL` | `https://rickandmortyapi.com/api`        | Base URL of the Rick and Morty API     |
