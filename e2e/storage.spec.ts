import type { Page } from '@playwright/test'

import { expect, openPage, test } from './fixtures'

// Browsers set to block site data throw from the storage getters themselves.
async function blockSiteData(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError')
        },
      })
    }
  })
}

test.describe('blocked storage', { tag: '@journey' }, () => {
  test('keeps the app working for the visit when the browser blocks site data', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowConsoleErrors(/^\[storage\]/)
    await blockSiteData(page)

    await openPage(page, '/')

    await expect(page.locator('#results').getByRole('article')).toHaveCount(12)
    await expect(page.getByText("Couldn't save in this browser", { exact: true })).toBeVisible()
    const toggle = page.getByRole('button', { name: 'Favorite Rick Sanchez', exact: true })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Favorites' })
      .click()
    await expect(page.locator('#favorites').getByRole('heading', { level: 2 })).toHaveText([
      'Rick Sanchez',
    ])
  })
})
