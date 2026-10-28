import { expect, openPage, test } from './fixtures'
import { trackApiCalls } from './support/api-mock'

test.describe('not found', { tag: '@journey' }, () => {
  test('answers an unknown path with HTTP 404 and the not-found view', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(/\/nope$/)

    const response = await openPage(page, '/nope')

    expect(response?.status()).toBe(404)
    await expect(page).toHaveTitle('Page not found | Rick and Morty Explorer')
    await expect(
      page.getByRole('heading', { level: 1, name: "Wrong dimension. We couldn't find this page." }),
    ).toBeVisible()
  })

  test('leads back to the character list', async ({ page, consoleGuard }) => {
    consoleGuard.allowHttpErrors(/\/nope$/)
    await openPage(page, '/nope')

    await page.getByRole('link', { name: 'Browse characters' }).click()

    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Rick and Morty characters' }),
    ).toBeFocused()
  })

  test('answers a malformed character id as not found without asking the API', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(/\/characters\/abc$/)
    const apiCalls = trackApiCalls(page)

    const response = await openPage(page, '/characters/abc')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { level: 1, name: "Wrong dimension. We couldn't find this page." }),
    ).toBeVisible()
    expect(apiCalls).toEqual([])
  })
})
