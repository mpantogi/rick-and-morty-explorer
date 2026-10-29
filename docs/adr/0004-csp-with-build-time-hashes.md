# 0004. Content Security Policy with build-time hashes

Status: accepted

## Context

- Scripts must run without `'unsafe-inline'` or `'unsafe-eval'`. Every page has inline scripts:
  the no-flash theme script from `index.html` and, on character pages, vite-ssg's
  `window.__INITIAL_STATE__` script, which differs per page.
- Netlify serves static files. A meta tag can carry most of a policy but not `frame-ancestors`.
- Zod 4.6.7 probes `new Function` when it builds an object schema, to decide whether it can compile
  parsers. Under this policy every probe is a CSP violation unless Zod runs jitless.

## Decision

- Each page gets a meta CSP, built by `build/csp.ts` in vite-ssg's `onPageRendered` hook, which
  sees the final HTML. It hashes every inline executable script (sha256) and inserts the meta tag
  right after `<meta charset>`. Policy: `default-src 'self'`; `script-src 'self'` plus the hashes;
  `style-src 'self' 'unsafe-inline'`; `img-src 'self' https:`; `connect-src 'self'` plus the API
  origin; `font-src`, `manifest-src` and `base-uri` `'self'`; `object-src 'none'`;
  `form-action 'self'`.
- The build refuses a page (`CspError`) whose inline scripts are anything but `index.html`'s own
  and at most one state script, so a stray script cannot get hashed into the policy. A state
  script is exactly `window.__INITIAL_STATE__=` and one JSON string literal holding a JSON object
  (both levels are parsed), with an optional trailing `;`.
- `public/_headers` carries what a meta tag cannot: `frame-ancestors 'none'`, `X-Frame-Options`,
  HSTS, COOP, `Referrer-Policy`, `Permissions-Policy` and `nosniff`.
- `style-src` allows `'unsafe-inline'`: vue-sonner sets inline styles, and VueUse's `useColorMode`
  inserts a short-lived `<style>` that turns transitions off while the theme switches.
- No `upgrade-insecure-requests`: it breaks WebKit against the `http://localhost` E2E server, and
  `img-src https:` already refuses `http:` images.
- JSON-LD is an `application/ld+json` block (data, not hashed), serialised by unhead, which escapes
  a `</script>` inside API text (unit-tested).
- Zod: `src/shared/zod` calls `z.config({ jitless: true })` and re-exports `z`, and every runtime
  import of Zod in `src` goes through it (ESLint `@typescript-eslint/no-restricted-imports`; type
  imports stay allowed). ESM runs a module's dependencies first, so no schema is built before the
  config.

## Rejected alternative

A side-effect module imported first in `main.ts`. On its own it fails: Rolldown puts schemas in
shared chunks that run before the entry's own imports, and the probes fire. Rolldown's
`output.strictExecutionOrder` fixes the order but cost 6.0 KiB gzip of initial JavaScript (116.2
against 110.2 KiB, both measured on a client build). With the explicit import the home page loads
110.4 KiB (`yarn check:budget`).

## Consequences

- An inline script added anywhere fails the build until it is removed or the guard learns it.
- Host-side HTML rewriting (snippet injection, asset optimisation) would break the hashes, so it
  stays off. The E2E console guard fails any test that logs a CSP violation, and
  `security.spec.ts` checks the headers.
- Removing the Zod config turns the E2E CSP checks red; a direct `zod` import in `src` fails lint.
