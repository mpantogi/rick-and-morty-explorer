# 0007. Deploy from CI after the E2E suite

Status: accepted

## Context

- The site is static: Netlify serves `dist/` as built.
- CI builds `dist/` once in the `verify` job, and the `e2e` job runs the whole Playwright matrix
  against that artifact.
- The Netlify project is on the credit-based Free plan. Every successful production deploy spends
  credits from a monthly allowance, and Netlify pauses the account's sites when it runs out.

## Decision

- A `deploy` job in `.github/workflows/ci.yml` runs on pushes to `main` once `e2e` has passed. It
  downloads the `dist` artifact and publishes it with
  `netlify deploy --prod --no-build --dir=dist`, so what goes live is what the tests ran against.
  Pull requests never deploy.
- `netlify-cli` is pinned to an exact version and authenticates with a personal access token from
  the `NETLIFY_AUTH_TOKEN` repository secret. The site ID is not a secret, so it is in the
  workflow.
- The job targets the `production` GitHub environment, so the repository lists each deploy with
  the live URL.
- The Netlify project is not linked to the repository. A Git-connected build would run on every
  push without waiting for CI, and would publish a second, untested build.

## Consequences

- A failing `verify` or `e2e` keeps the previous deploy live, and so does a failed upload: Netlify
  publishes a deploy only once all of it has arrived.
- A newer push cancels the running workflow, so a burst of pushes deploys once. Every green push
  to `main` still spends credits, so related commits are pushed together.
- Rolling back is "Publish deploy" on an earlier deploy in Netlify, then a revert on `main`, or
  the next push publishes the bad build again.
- The token expires on the date chosen when it was created, and a Netlify password reset revokes
  it. The `deploy` job then fails, and the secret needs a new token.
- `netlify.toml` keeps the build settings (`yarn build`, `dist`, Node 24, the production
  `VITE_SITE_URL`) for a build that runs on Netlify: `netlify deploy` without `--no-build`, or a
  Git-connected project.
