# 0001. Static generation without hydration

Status: accepted

## Context

- Crawlers, AI agents and link previews need real HTML for every character, and the site has no
  server of its own: Netlify serves static files.
- Favorites, created heroes and the theme live in `localStorage`, which a build cannot see.
  Hydrating server HTML would mean gating every client-persisted value behind a mount check, and
  the one shell that serves every `/heroes/:id` would never match the hero it shows.
- vite-ssg 28.3 defaults to `hydration: false`: the client mounts a fresh Vue app into `#app`,
  which clears the prerendered markup. The HTML serves first paint, crawlers and readers without
  JavaScript.

## Decision

- Prerender with vite-ssg and keep `hydration: false`. Routes: `/`, `/favorites`, `/heroes/new`,
  `/heroes/shell`, `/404` and one page per API character (826 today).
- Load the build's data in three bulk requests (`src/app/ssg/catalogue.ts`): the character count,
  every character by id, and every episode they appear in.
- Seed each character route's QueryClient with the same `queryOptions` keys the page reads
  (`src/app/ssg/seed-route.ts`) and embed the dehydrated state in the page. The first client render
  reads it and matches the HTML without a request.
- Data only the browser holds renders a skeleton in the prerender: the home results, the favorites
  list and the hero page. The home page prerenders its header, heading, intro and filters.
- `public/_redirects` serves every `/heroes/:id` from the shell. Any other unknown path gets
  `404.html` with a real 404 status.

## Consequences

- Hydration mismatches cannot happen, and persisted state needs no client-only wrappers.
- The client renders each page once on boot instead of hydrating it. Both renders use the same
  data, so nothing moves, but the cost is a full mount.
- Character pages keep working when the API is down, because their data ships in the HTML and
  never goes stale (ADR 0002). The build needs the API: if it is down, the build fails and the
  previous deploy stays live.
- Character pages are as fresh as the last build, which is acceptable for a dataset that has been
  unchanged since 2021.
- A hero page always answers 200: only the browser knows whether the hero exists, so it shows
  not-found itself.
- The build fails (`CatalogueError`) if character ids stop being contiguous from 1. Paging through
  the list is the root fix if the API ever changes that.
