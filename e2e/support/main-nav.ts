import type { Locator, Page } from '@playwright/test'

// Below sm the main navigation folds behind the menu button, which shows only there.
export async function openMainNav(page: Page): Promise<Locator> {
  const menu = page.getByRole('button', { name: 'Menu' })
  if (await menu.isVisible()) await menu.click()
  return page.getByRole('navigation', { name: 'Main' })
}
