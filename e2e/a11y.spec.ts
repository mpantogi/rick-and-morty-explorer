import { expect, openPage, type Theme, test, useStoredTheme } from './fixtures'
import { FIRST_LIST_PAGE_URL, failWith, LIST_URL } from './support/api-mock'
import { openMainNav } from './support/main-nav'
import { openRoute, ROUTES } from './support/routes'

const THEMES: readonly Theme[] = ['light', 'dark']
const SERVER_ERROR = 500
const PHONE_VIEWPORT = { width: 375, height: 667 }

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

  for (const { control, open } of [
    { control: 'status list', open: { role: 'combobox', name: 'Status' } },
    { control: 'species suggestions', open: { role: 'button', name: 'Species' } },
  ] as const) {
    test(`home with the ${control} open has no WCAG 2.2 AA violations in the ${theme} theme`, async ({
      page,
      makeAxeBuilder,
    }) => {
      await useStoredTheme(page, theme)
      await openPage(page, '/')

      await page.getByRole(open.role, { name: open.name }).click()
      await expect(page.getByRole('listbox')).toBeVisible()

      const { violations } = await makeAxeBuilder().analyze()
      expect(violations).toEqual([])
    })
  }

  test(`home with the phone menu open has no WCAG 2.2 AA violations in the ${theme} theme`, async ({
    page,
    makeAxeBuilder,
  }) => {
    await useStoredTheme(page, theme)
    await page.setViewportSize(PHONE_VIEWPORT)
    await openPage(page, '/')

    await expect((await openMainNav(page)).getByRole('link')).toHaveCount(3)

    const { violations } = await makeAxeBuilder().analyze()
    expect(violations).toEqual([])
  })

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
