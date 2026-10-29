import type { Locator, Page } from '@playwright/test'

import { expect, openPage, test, useStoredHeroes } from './fixtures'
import { holdResponses, LIST_URL } from './support/api-mock'
import { PORTAL_PETE } from './support/heroes'
import { openMainNav } from './support/main-nav'
import { openRoute, ROUTES } from './support/routes'

const WIDTHS = [320, 375, 640, 768, 1024, 1440, 1920] as const
const PHONE_WIDTHS = [320, 375] as const
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

// Controls whose label spills out of their box, and controls whose boxes overlap a later one.
function controlProblems(controls: Locator) {
  return controls.evaluateAll((elements) => {
    const items = elements.map((element) => ({
      label: element.getAttribute('aria-label') ?? element.textContent.trim(),
      box: element.getBoundingClientRect(),
      clipped: element.scrollWidth > element.clientWidth,
    }))
    const overlaps = (a: DOMRect, b: DOMRect) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    return {
      clipped: items.filter((item) => item.clipped).map((item) => item.label),
      overlapping: items
        .filter((item, index) =>
          items.slice(index + 1).some((other) => overlaps(item.box, other.box)),
        )
        .map((item) => item.label),
    }
  })
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
      const links = (await openMainNav(page)).getByRole('link')

      expect(await hasHorizontalOverflow(page)).toBe(false)
      await expect(links).toHaveCount(3)
      const linkHeights = await links.evaluateAll((all) =>
        all.map((link) => link.getBoundingClientRect().height),
      )
      for (const height of linkHeights) expect(height).toBeLessThanOrEqual(NAV_LINK_MAX_HEIGHT)
    })
  }
}

// The phone header row has no room to spare at 200% text; the menu lists one link per row.
for (const width of PHONE_WIDTHS) {
  test(`header keeps every control whole and apart at ${String(width)} px with text at 200%`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
    await openPage(page, '/')

    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    await expect((await openMainNav(page)).getByRole('link')).toHaveCount(3)

    const banner = page.getByRole('banner')
    expect(await controlProblems(banner.getByRole('link').or(banner.getByRole('button')))).toEqual({
      clipped: [],
      overlapping: [],
    })
  })
}

test(
  'folds the main navigation behind a menu button on a phone',
  { tag: '@journey' },
  async ({ page }) => {
    await page.setViewportSize({ width: PHONE_WIDTHS[1], height: VIEWPORT_HEIGHT })
    await openPage(page, '/')
    const menu = page.getByRole('button', { name: 'Menu' })
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav).toBeHidden()

    await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.getByRole('link')).toHaveCount(3)
    await page.getByRole('heading', { level: 1 }).click()
    await expect(nav).toBeHidden()

    await menu.click()
    await nav.getByRole('link', { name: 'Favorites' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeFocused()
    await expect(nav).toBeHidden()
    await expect(menu).toHaveAttribute('aria-expanded', 'false')

    // A link to the page already open hides with the menu, so focus returns to the button.
    await menu.click()
    await nav.getByRole('link', { name: 'Favorites' }).press('Enter')

    await expect(menu).toBeFocused()
    await expect(nav).toBeHidden()
  },
)

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
