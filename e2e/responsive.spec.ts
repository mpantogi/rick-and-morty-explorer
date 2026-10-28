import type { Page } from '@playwright/test'

import { expect, openPage, test } from './fixtures'
import { ROUTES } from './support/routes'

const WIDTHS = [320, 375, 640, 768, 1024, 1440, 1920] as const
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

      await openPage(page, route.path)

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
