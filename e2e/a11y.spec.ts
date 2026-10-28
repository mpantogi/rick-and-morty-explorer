import { expect, openPage, type Theme, test, useStoredTheme } from './fixtures'
import { ROUTES } from './support/routes'

const THEMES: readonly Theme[] = ['light', 'dark']

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`${route.name} page has no WCAG 2.2 AA violations in the ${theme} theme`, async ({
      page,
      consoleGuard,
      makeAxeBuilder,
    }) => {
      consoleGuard.allowHttpErrors(...route.expectedHttpErrors)
      await useStoredTheme(page, theme)

      await openPage(page, route.path)
      await expect(page.locator('#page-title')).toBeVisible()

      const { violations } = await makeAxeBuilder().analyze()
      expect(violations).toEqual([])
    })
  }
}
