import type { Page } from '@playwright/test'

import { expect, openPage, test, useStoredFavorites } from './fixtures'
import { LIST_URL } from './support/api-mock'
import { ROUTES } from './support/routes'

const WIDTHS = [320, 375, 640, 768, 1024, 1440, 1920] as const
const CARD_WIDTHS = [320, 768, 1440] as const
const VIEWPORT_HEIGHT = 900
const NAV_LINK_MAX_HEIGHT = 48
const TOO_WIDE_PX = 2000

function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
}

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    test(`${route.name} page fits ${String(width)} px without horizontal scrolling`, async ({
      page,
      consoleGuard,
    }) => {
      consoleGuard.allowHttpErrors(...route.expectedHttpErrors)
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
      await useStoredFavorites(page, route.favorites ?? [])

      await openPage(page, route.path)
      await expect(page.locator(route.settled)).toBeVisible()

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
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(LIST_URL, async (route) => {
      await gate
      await route.fallback()
    })
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
