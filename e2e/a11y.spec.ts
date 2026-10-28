import { expect, openPage, type Theme, test, useStoredTheme } from './fixtures'
import { FIRST_LIST_PAGE_URL, failWith, LIST_URL } from './support/api-mock'
import { openRoute, ROUTES } from './support/routes'

const THEMES: readonly Theme[] = ['light', 'dark']
const SERVER_ERROR = 500

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`${route.name} page has no WCAG 2.2 AA violations in the ${theme} theme`, async ({
      page,
      consoleGuard,
      makeAxeBuilder,
    }) => {
      consoleGuard.allowHttpErrors(...route.expectedHttpErrors)
      await useStoredTheme(page, theme)

      await openRoute(page, route)

      const { violations } = await makeAxeBuilder().analyze()
      expect(violations).toEqual([])
    })
  }

  test(`home error state has no WCAG 2.2 AA violations in the ${theme} theme`, async ({
    page,
    consoleGuard,
    makeAxeBuilder,
  }) => {
    consoleGuard.allowHttpErrors(FIRST_LIST_PAGE_URL)
    await useStoredTheme(page, theme)
    await page.route(LIST_URL, failWith(SERVER_ERROR))

    await openPage(page, '/')
    await expect(page.locator('#results [data-state="error"]')).toBeVisible()

    const { violations } = await makeAxeBuilder().analyze()
    expect(violations).toEqual([])
  })
}
