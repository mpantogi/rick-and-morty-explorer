# Rick and Morty Explorer

A Vue 3 app for browsing the characters of Rick and Morty through the public
[Rick and Morty API](https://rickandmortyapi.com): search and filter the character list, open a
character's page, save favorites and create a hero of your own. Pages are statically generated with
vite-ssg. Unofficial fan project.

Live site: https://rickverse-explorer.netlify.app

## Task → feature map

| Task                   | What it does                                                                                    | Where                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1.1 12 per page        | 12 characters per page over the API's 20-item pages; pagination kept in the URL (`?page=n`)     | `widgets/character-browser`, `entities/character`         |
| 1.2 Filters            | Name (debounced search), Status, Species (with suggestions), Type, Gender; applied by the API   | `features/character-filters`                              |
| 1.3 Character detail   | `/characters/:id`: photo, name, status, species, type, gender, origin, location, every episode  | `pages/character`, `entities/episode`                     |
| 2 Create hero          | Name, gender radios and an `https:` image URL with live preview; the hero leads the list        | `features/create-hero`, `pages/hero-create`, `pages/hero` |
| 3 Dark mode            | Header toggle, light by default, `#202329` canvas, saved and applied before first paint         | `features/theme`, `index.html`                            |
| 4 Favorites            | A heart on every card and character page; `/favorites` lists them, newest first                 | `features/favorites`, `widgets/favorites-list`            |
| Composition API        | `<script setup lang="ts">` everywhere, logic in `use*` composables, enforced by ESLint          | `eslint.config.ts`                                        |
| Tailwind and BEM       | BEM class first on every element, then utilities; semantic colour tokens                        | [Design system](#design-system)                           |
| Architecture           | Feature-Sliced Design, enforced by eslint-plugin-boundaries                                     | [Architecture](#architecture)                             |
| Tests                  | Vitest, Testing Library and MSW, test-first; Playwright in six browser and device projects      | [Testing](#testing)                                       |
| Server state           | TanStack Vue Query for every API request; Pinia only for favorites and heroes                   | [ADR 0002](docs/adr/0002-server-state-and-page-window.md) |
| Performance, semantics | Code splitting, idle prefetch, prioritised images, a bundle budget; landmarks, live regions     | `scripts/check-budget.ts`, `src/app/lib`                  |
| SEO, security          | Titles, canonicals, social tags, JSON-LD, sitemap, robots, `llms.txt`; per-page CSP and headers | `build/`, `public/_headers`                               |
| Deployment             | Static site on Netlify, deployed by CI once the E2E suite passes                                | [Deploy](#deploy)                                         |

## Decisions and trade-offs

- **Static generation without hydration.** vite-ssg prerenders every page for crawlers and first
  paint, and the client then mounts fresh over it. Favorites, heroes and the theme live in
  `localStorage`, which a build cannot see, so hydrating would mean gating each of them; regions
  that depend on them render a skeleton in the HTML instead. Character pages embed their data, so
  they open without a request. [ADR 0001](docs/adr/0001-ssg-without-hydration.md)
- **12 over 20.** The API pages by 20 and the task asks for 12. A pure function maps each UI page
  (after any matching heroes) onto the one or two API pages that cover it, and each API page is
  cached on its own, so paging never repeats a request.
  [ADR 0002](docs/adr/0002-server-state-and-page-window.md)
- **Filters keep the API's semantics.** Filtering happens on the server, and created heroes are
  filtered locally with the same rules. The API matches substrings, so `species=human` also returns
  Humanoid characters; there is no exact filter. Fourteen names use the typographic apostrophe
  (`’`), so typing `Morty's` with a plain `'` misses them, and there is no accent folding
  (`Martinez` does not find `Martínez`). Working around either would take extra API requests per
  search, or a client-side filter that breaks the API's counts and paging, so both are accepted.
- **Local persistence.** Favorites and heroes are Pinia stores backed by VueUse `useStorage`,
  with versioned keys, a Zod check on every read and caps of 2,000 favorites and 500 heroes. When
  the browser blocks site data, the app says so once and keeps them in memory for the visit.
  pinia-plugin-persistedstate is not used because `useStorage`, from a library the app already
  depends on, already gives each store a validated, cross-tab-synced ref.
  [ADR 0006](docs/adr/0006-local-persistence-with-vueuse.md)
- **Errors.** The query client raises one toast per kind of failure, and each region shows its own
  error with a retry. A missing character or route gets a full error page; 404s from filters are an
  empty state, not an error.
- **Forms.** vee-validate 4 has no Zod 4 support, so a 30-line local adapter feeds it the same Zod
  schema that validates stored heroes. [ADR 0005](docs/adr/0005-vee-validate-zod4-adapter.md)
- **Content Security Policy.** Inline scripts are allowed by build-time hashes, never by
  `'unsafe-inline'`, and Zod runs without `eval`.
  [ADR 0004](docs/adr/0004-csp-with-build-time-hashes.md)
- **API availability.** The Rick and Morty API is run by volunteers with no SLA. Prerendered
  character pages keep working when it is down; the list, the filters and favorites need it and
  show an error with a retry. Requests time out after 10 s and network or server errors are retried
  twice. The next step would be a static snapshot: the build already loads every character and
  episode, and publishing that data with the site would give the list a fallback.
- **Deploys from CI.** A push to `main` goes live only after `verify` and `e2e` pass: the `deploy`
  job publishes the `dist` artifact those jobs built and tested, and Netlify never builds, because
  a Git-connected build would not wait for the tests. [ADR 0007](docs/adr/0007-deploy-from-ci.md)

## Architecture

Feature-Sliced Design. Layers import downward only, slices of one layer never import each other,
and other layers import a slice through its `index.ts`.

```text
src/
  app/        entry (vite-ssg), router, query client, prerender data (ssg/), styles
  pages/      home, character, favorites, hero-create, hero, not-found
  widgets/    layout, character-browser, favorites-list
  features/   character-filters, favorites, create-hero, theme
  entities/   character, episode
  shared/     api (fetch client), config, lib, ui (design system), zod (jitless Zod)
build/        vite-ssg hooks: per-page CSP, sitemap.xml, robots.txt, llms.txt
scripts/      serve-dist, check-budget (+ budget logic), generate-icons, record-e2e-fixture
test/         Vitest setup, MSW handlers, API semantics, fixtures
e2e/          Playwright specs, fixtures, API mock and state probe
docs/adr/     architecture decision records
public/       _redirects, _headers, icons, web manifest, social card
```

## Design system

Reusable UI is built once in `src/shared/ui` as `Base*` components, and every button, link, form
control, badge and skeleton uses them:

| Component      | Purpose                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `BaseButton`   | `primary`, `secondary` or `ghost`, at `md` or `icon` size; renders a router link or a button            |
| `BaseLink`     | Permanently underlined inline link, internal (`to`) or external (`href`)                                |
| `BaseField`    | Label, hint and error for one control, with the ids and ARIA attributes passed to it through slot props |
| `BaseInput`    | Text input with `v-model` and the shared control styling                                                |
| `BaseSelect`   | Select with `v-model`, typed options and the same styling                                               |
| `BaseBadge`    | Pill in a `neutral`, `success`, `danger` or `accent` tone, with an optional dot                         |
| `BaseSkeleton` | Pulsing placeholder sized by its caller                                                                 |

Colours are semantic tokens in `src/app/styles/main.css` (`canvas`, `surface`, `field`, `fg`,
`muted`, `line`, `accent`, `danger`, `success`, the status colours and their subtle fills). Light
values sit on `:root` and dark values on `.dark`, both taken from Tailwind's default palette except
the required `#202329` canvas, and `@theme inline` exposes them as utilities (`bg-surface`,
`text-muted`). Every text pair reaches at least 4.5:1 contrast in both themes. Spacing, type and
radii use Tailwind's default scale.

## Tech stack

- Vue 3.5.44 with `<script setup>` and the Composition API
- Vue Router 5.4.0, Pinia 4.1.0, TanStack Vue Query 5.105.0, VueUse 15.0.0
- Zod 4.6.7, vue-sonner 2.0.9 (toasts), @unhead/vue 2.1.17 (head tags), @lucide/vue 1.63.0 (icons)
- vee-validate 4.15.1 (forms), fed by the Zod schemas through a small local adapter
- Vite 8.3.5 with vite-ssg 28.3.0, TypeScript 6.0.3, vue-tsc 3.3.13
- Tailwind CSS 4.3.3
- Vitest 5.0.5, Testing Library for Vue 8.1.0, MSW 3.0.3, jsdom 29.1.1
- Playwright 1.64.1 with @axe-core/playwright 4.14.0
- ESLint 10.13.0 (eslint-plugin-boundaries 7.4.0 enforces the layer rules), Prettier 3.9.10
- simple-git-hooks 2.14.0 and lint-staged 17.6.0 for the pre-commit check
- Yarn 4.18.1 on Node 24

Every dependency is pinned to an exact version.

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
| `yarn preview`        | Serve `dist/` with Netlify-style routing and headers on port 4173    |
| `yarn test`           | Run the unit and integration tests once                              |
| `yarn test:watch`     | Run the tests in watch mode                                          |
| `yarn test:coverage`  | Run the tests with coverage thresholds                               |
| `yarn test:e2e`       | Run the Playwright suite against the built `dist/` (build first)     |
| `yarn icons`          | Regenerate the favicon set, manifest and social card in `public/`    |
| `yarn check:budget`   | Gzip budget for the home page's initial JS and CSS (build first)     |
| `yarn verify`         | Format, lint, typecheck, coverage, build and budget, in that order   |
| `yarn record:fixture` | Re-record the E2E API fixture from the live API (two requests)       |
| `yarn lint`           | ESLint with zero warnings allowed                                    |
| `yarn lint:fix`       | ESLint with autofix                                                  |
| `yarn typecheck`      | Type-check every project with `vue-tsc --build`                      |
| `yarn format`         | Format the repo with Prettier                                        |
| `yarn format:check`   | Check formatting without writing                                     |

`yarn build` loads every character and episode from the live API in three bulk requests and
prerenders one page per character, with its data embedded. It then writes `sitemap.xml` (home plus
every character page), `robots.txt` and `llms.txt` into `dist/`. If the API is down, the build
fails rather than publishing broken pages.

## Testing

- **Unit and integration (Vitest):** pure logic, composables and components, written test-first.
  Components render with the real router, Pinia, Vue Query and head manager (`test/render.ts`).
  MSW answers API requests from real recorded characters and episodes, with the API's own
  filtering, paging and 404 rules (`test/api-semantics.ts`). Coverage must stay at 85% of lines,
  statements and functions and 80% of branches. `build/eslint-boundaries.test.ts` proves the
  architecture gate rejects what it should.
- **End-to-end (Playwright):** runs against the built `dist/`, served by `scripts/serve-dist.ts`
  with Netlify's rewrites, headers and 404 status. Every API request is answered from
  `e2e/support/api-fixture.json` (characters 1–60 and their episodes), and any console error,
  uncaught error or CSP violation fails the test. Chromium runs every spec: user journeys,
  keyboard use, axe (WCAG 2.2 AA) on every route in both themes, layout at widths from 320 to
  1920 px, single-state checks on every data region, SEO tags and crawler files, and security
  headers. Firefox, WebKit, Pixel 10, iPhone 17 and iPad run the `@journey` specs.

```sh
yarn build
yarn playwright install chromium firefox webkit
yarn test:e2e                      # the whole matrix
yarn test:e2e --project=chromium   # Chromium only
```

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests: a
dependency audit, format, lint, typecheck, coverage, build and budget, then the whole Playwright
matrix against that build. On a push to `main` that passes both, it then deploys that same build
([Deploy](#deploy)).

## Configuration

Both variables are optional. Their defaults are `SITE.defaultUrl` and `SITE.apiBaseUrl` in
`src/shared/config/site.ts`, and `src/shared/config/parse-env.ts` validates them: the build and the
app fail fast if either is not an `https:` URL. Set them in the shell or in an untracked
`.env.local`. CI builds with the defaults; `netlify.toml` sets Node 24 and the production
`VITE_SITE_URL` for a build that runs on Netlify.

| Variable            | Default                                  | Used for                               |
| ------------------- | ---------------------------------------- | -------------------------------------- |
| `VITE_SITE_URL`     | `https://rickverse-explorer.netlify.app` | Canonical URLs, social tags, SEO files |
| `VITE_API_BASE_URL` | `https://rickandmortyapi.com/api`        | Base URL of the Rick and Morty API     |

## Deploy

The site is static: Netlify serves `dist/` as built, including `public/_redirects` (the hero page
rewrites) and `public/_headers` (security and cache headers, and the web manifest's media type).

- **From CI (the live site):** on a push to `main`, once `verify` and `e2e` pass, the `deploy` job
  publishes the `dist` artifact they built and tested with
  `netlify deploy --prod --no-build --dir=dist`. It needs a Netlify personal access token (User
  settings > Applications > Personal access tokens) in the repository secret `NETLIFY_AUTH_TOKEN`;
  the site ID is set in the workflow. Pull requests never deploy.
  [ADR 0007](docs/adr/0007-deploy-from-ci.md)
- **By hand:** `yarn build`, then `netlify deploy --prod --no-build --dir=dist`, which uploads that
  build instead of building again (without a global install:
  `yarn dlx netlify-cli deploy --prod --no-build --dir=dist`).
- **Git-connected:** link the repository to a Netlify site instead. Netlify reads `netlify.toml`
  (build command `yarn build`, publish directory `dist`, Node 24 and the production
  `VITE_SITE_URL`) and builds on every push to the production branch, without waiting for CI.

A new Netlify project on the Free plan injects a "Powered by Netlify" badge into the pages it
serves. The badge's `srcdoc` iframe inherits each page's meta CSP, so turn it off under Project
configuration > General, or set `built_with_badge_enabled: false` through the Netlify API.
