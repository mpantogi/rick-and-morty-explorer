import type { Locator, Page } from '@playwright/test'

import { expect, openPage, test, useStoredHeroes } from './fixtures'
import { LIST_URL } from './support/api-mock'
import { PORTAL_PETE } from './support/heroes'
import { openRoute, ROUTES } from './support/routes'

const WIDTHS = [320, 375, 640, 768, 1024, 1440, 1920] as const
const CARD_WIDTHS = [320, 768, 1440] as const
const PROFILE_WIDTHS = [320, 768, 1280] as const
// Bill (#45): one-line values at every width and a status badge; the favorites page caches nobody.
const UNCACHED_CHARACTER_PATH = '/characters/45'
const UNCACHED_CHARACTER_URL = /\/api\/character\/45$/
const APP_SCRIPTS_URL = /\/assets\/.+\.js$/
const VIEWPORT_HEIGHT = 900
const NAV_LINK_MAX_HEIGHT = 48
const TOO_WIDE_PX = 2000

interface MountedApp {
  config: { globalProperties: { $router: { push: (path: string) => Promise<unknown> } } }
}

function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
}

// Holds every matching response until the returned function releases them.
async function holdResponses(page: Page, url: RegExp): Promise<() => void> {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(url, async (route) => {
    await gate
    await route.fallback()
  })
  return release
}

// A client-side navigation, as a link would make, to a page with no link on screen.
function navigateInApp(page: Page, path: string): Promise<void> {
  return page.evaluate(async (target) => {
    const root = document.querySelector<HTMLElement & { __vue_app__?: MountedApp }>('#app')
    await root?.__vue_app__?.config.globalProperties.$router.push(target)
  }, path)
}

function cellBoxes(list: Locator) {
  return list.locator(':scope > dt, :scope > dd').evaluateAll((cells) =>
    cells.map((cell) => {
      const { x, y, width, height } = cell.getBoundingClientRect()
      return { x, y: y + window.scrollY, width, height }
    }),
  )
}

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    test(`${route.name} page fits ${String(width)} px without horizontal scrolling`, async ({
      page,
      consoleGuard,
    }) => {
      consoleGuard.allowHttpErrors(...route.expectedHttpErrors)
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })

      await openRoute(page, route)

      expect(await hasHorizontalOverflow(page)).toBe(false)
      const linkHeights = await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link')
        .evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height))
      expect(linkHeights).toHaveLength(3)
      for (const height of linkHeights) expect(height).toBeLessThanOrEqual(NAV_LINK_MAX_HEIGHT)
    })
  }
}

for (const width of CARD_WIDTHS) {
  test(`character cards show their content unclipped at ${String(width)} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
    await openPage(page, '/')
    await expect(page.locator('#results').getByRole('article')).toHaveCount(12)

    const clipped = await page
      .locator('.character-card__body')
      .evaluateAll(
        (bodies) => bodies.filter((body) => body.scrollHeight > body.clientHeight).length,
      )

    expect(clipped).toBe(0)
  })

  test(`cards take exactly their skeletons' place at ${String(width)} px`, async ({ page }) => {
    const release = await holdResponses(page, LIST_URL)
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
    await openPage(page, '/')
    const firstSkeleton = page.locator('.character-card-skeleton').first()
    await expect(firstSkeleton).toBeVisible()
    const skeleton = await firstSkeleton.boundingBox()

    release()
    const card = page.locator('.character-card').first()
    await expect(card).toBeVisible()

    expect(skeleton).not.toBeNull()
    expect(await card.boundingBox()).toEqual(skeleton)
  })
}

for (const width of PROFILE_WIDTHS) {
  test(`profile rows take exactly their skeleton's place at ${String(width)} px`, async ({
    page,
  }) => {
    const release = await holdResponses(page, UNCACHED_CHARACTER_URL)
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
    await openPage(page, '/favorites')
    await expect(page.locator('#favorites [data-state="empty"]')).toBeVisible()

    await navigateInApp(page, UNCACHED_CHARACTER_PATH)
    await expect(page.locator('#profile [data-state="loading"]')).toBeVisible()
    const skeleton = await cellBoxes(page.locator('.character-profile-skeleton__facts'))
    release()
    await expect(page.locator('#profile [data-state="ready"]')).toBeVisible()

    expect(skeleton).toHaveLength(12)
    expect(await cellBoxes(page.locator('.character-profile__facts'))).toEqual(skeleton)
  })
}

for (const width of PROFILE_WIDTHS) {
  test(`a created hero takes exactly the prerendered shell's place at ${String(width)} px`, async ({
    page,
  }) => {
    await useStoredHeroes(page, [PORTAL_PETE])
    const release = await holdResponses(page, APP_SCRIPTS_URL)
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })

    // Until the scripts arrive, the page is the shell exactly as it was prerendered.
    await page.goto(`/heroes/${PORTAL_PETE.id}`, { waitUntil: 'commit' })
    await expect(page.locator('#profile [data-state="loading"]')).toBeVisible()
    const shell = await cellBoxes(page.locator('.character-profile-skeleton__facts'))
    release()
    await expect(page.locator('#profile [data-state="ready"]')).toBeVisible()

    expect(shell).toHaveLength(12)
    expect(await cellBoxes(page.locator('.character-profile__facts'))).toEqual(shell)
  })
}

test('the overflow check catches content wider than the viewport', async ({ page }) => {
  await page.setViewportSize({ width: WIDTHS[0], height: VIEWPORT_HEIGHT })
  await openPage(page, '/')

  await page.evaluate((px) => {
    const wide = document.createElement('div')
    wide.style.width = `${String(px)}px`
    wide.style.height = '1px'
    document.querySelector('main')?.append(wide)
  }, TOO_WIDE_PX)

  expect(await hasHorizontalOverflow(page)).toBe(true)
})
