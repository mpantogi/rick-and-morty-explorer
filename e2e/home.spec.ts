import type { Page } from '@playwright/test'

import { expect, openPage, test } from './fixtures'
import { failWith, LIST_URL } from './support/api-mock'
import { captureAround, countChangedPixels } from './support/pixels'
import { installStateProbe, readStateProbe, statesOf } from './support/state-probe'

const SERVER_ERROR = 500
// A 2 px ring around a card repaints over a thousand pixels; a clipped one repaints none.
const VISIBLE_RING_PIXELS = 500

function results(page: Page) {
  return page.getByRole('region', { name: 'Results' })
}

function cards(page: Page) {
  return page.locator('#results').getByRole('article')
}

function summary(page: Page) {
  return results(page).getByRole('status')
}

// Below md the extra filters sit behind a toggle; from md up they are always shown.
async function openFilters(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: /^Filters/ })
  if (await toggle.isVisible()) await toggle.click()
}

test.describe('character list', { tag: '@journey' }, () => {
  test('lists the first 12 characters', async ({ page }) => {
    await openPage(page, '/')

    await expect(cards(page)).toHaveCount(12)
    await expect(cards(page).first().getByRole('heading')).toHaveText('Rick Sanchez')
    await expect(summary(page)).toHaveText('Showing 1–12 of 60 characters')
  })

  test('pages forward with Next and back with the browser', async ({ page }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)

    await page
      .getByRole('navigation', { name: 'Pagination' })
      .getByRole('link', { name: 'Next' })
      .click()

    await expect(page).toHaveURL('/?page=2')
    await expect(cards(page).first().getByRole('heading')).toHaveText('Alien Googah')
    await expect(page.getByRole('heading', { level: 2, name: 'Results' })).toBeFocused()

    await page.goBack()

    await expect(page).toHaveURL('/')
    await expect(cards(page).first().getByRole('heading')).toHaveText('Rick Sanchez')
  })

  test('opens a later page directly', async ({ page }) => {
    await openPage(page, '/?page=5')

    await expect(cards(page).first().getByRole('heading')).toHaveText('Blamph')
    await expect(summary(page)).toHaveText('Showing 49–60 of 60 characters')
    await expect(
      page.getByRole('navigation', { name: 'Pagination' }).getByRole('link', { name: 'Next' }),
    ).toHaveCount(0)
  })

  test('searches by name once the visitor stops typing', async ({ page }) => {
    const searched: string[] = []
    page.on('request', (request) => {
      const name = new URL(request.url()).searchParams.get('name')
      if (LIST_URL.test(request.url()) && name !== null) searched.push(name)
    })
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)

    await page.getByRole('searchbox', { name: 'Name' }).pressSequentially('rick', { delay: 50 })

    await expect(summary(page)).toHaveText('Showing 1–7 of 7 characters')
    await expect(page).toHaveURL('/?name=rick')
    expect(searched).toEqual(['rick'])
  })

  test('keeps the space between words when the visitor pauses mid-name', async ({ page }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)
    const name = page.getByRole('searchbox', { name: 'Name' })

    await name.pressSequentially('Rick ')
    await expect(page).toHaveURL('/?name=Rick')
    await name.pressSequentially('Sanchez')

    await expect(page).toHaveURL('/?name=Rick+Sanchez')
    await expect(name).toHaveValue('Rick Sanchez')
    await expect(summary(page)).toHaveText('Showing 1 of 1 character')
  })

  test('rings the card a keyboard user tabs to', async ({ page }) => {
    await openPage(page, '/')
    const card = cards(page).first()
    await expect(card.locator('img')).toHaveJSProperty('complete', true)
    await page.getByRole('heading', { level: 2, name: 'Results' }).focus()
    const unfocused = await captureAround(card)

    await page.keyboard.press('Tab')

    await expect(card.getByRole('link')).toBeFocused()
    const focused = await captureAround(card)
    expect(await countChangedPixels(page, unfocused, focused)).toBeGreaterThan(VISIBLE_RING_PIXELS)
  })

  test('opens at the top of the page', async ({ page }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)

    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  for (const { filter, apply, url, total } of [
    {
      filter: 'status',
      apply: (page: Page) =>
        page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Dead' }),
      url: '/?status=dead',
      total: 18,
    },
    {
      filter: 'species',
      apply: async (page: Page) => {
        await page.getByRole('combobox', { name: 'Species' }).fill('Alien')
        await page.getByRole('button', { name: 'Search' }).click()
      },
      url: '/?species=Alien',
      total: 19,
    },
    {
      filter: 'type',
      apply: async (page: Page) => {
        await page.getByRole('textbox', { name: 'Type' }).fill('Parasite')
        await page.getByRole('button', { name: 'Search' }).click()
      },
      url: '/?type=Parasite',
      total: 3,
    },
    {
      filter: 'gender',
      apply: (page: Page) =>
        page.getByRole('combobox', { name: 'Gender' }).selectOption({ label: 'Female' }),
      url: '/?gender=female',
      total: 12,
    },
  ]) {
    test(`filters by ${filter}`, async ({ page }) => {
      await openPage(page, '/')
      await expect(cards(page)).toHaveCount(12)
      await openFilters(page)

      await apply(page)

      await expect(page).toHaveURL(url)
      await expect(summary(page)).toHaveText(
        `Showing 1–${String(Math.min(total, 12))} of ${String(total)} characters`,
      )
    })
  }

  test('offers the known species as suggestions', async ({ page }) => {
    await openPage(page, '/')
    await openFilters(page)

    const listId = await page.getByRole('combobox', { name: 'Species' }).getAttribute('list')
    await expect(
      page.locator(`datalist#${listId ?? ''} option[value="Mythological Creature"]`),
    ).toHaveCount(1)
  })

  test('resets every filter and returns focus to the search box', async ({ page }) => {
    await openPage(page, '/?name=rick&status=alive')
    await expect(summary(page)).toHaveText('Showing 1–2 of 2 characters')

    await page.getByRole('search').getByRole('button', { name: 'Reset filters' }).click()

    await expect(page).toHaveURL('/')
    await expect(cards(page)).toHaveCount(12)
    await expect(page.getByRole('searchbox', { name: 'Name' })).toBeFocused()
  })

  test('shows the empty state when nothing matches', async ({ page, consoleGuard }) => {
    consoleGuard.allowHttpErrors(LIST_URL)
    await openPage(page, '/?name=zzzz')

    await expect(
      page.locator('#results').getByText('No characters match these filters.'),
    ).toBeVisible()
    await expect(summary(page)).toHaveText('No characters match these filters')
  })

  test('explains a page past the last one and links back to the first', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(LIST_URL)
    await openPage(page, '/?page=999')
    const region = page.locator('#results')

    await expect(region.getByText("There's no page 999.")).toBeVisible()
    await expect(region.getByText('This search has 5 pages.')).toBeVisible()
    await region.getByRole('link', { name: 'Go to the first page' }).click()

    await expect(page).toHaveURL('/')
    await expect(cards(page)).toHaveCount(12)
  })

  test('reports an API failure in place and recovers with Try again', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(LIST_URL)
    const failList = failWith(SERVER_ERROR)
    await page.route(LIST_URL, failList)
    await openPage(page, '/')
    const region = page.locator('#results')

    await expect(
      page.getByText("The Rick and Morty API isn't responding", { exact: true }),
    ).toBeVisible()
    await expect(region.getByText("Couldn't load characters.")).toBeVisible()
    await expect(region.locator('[data-state="loading"]')).toHaveCount(0)

    await page.unroute(LIST_URL, failList)
    await region.getByRole('button', { name: 'Try again' }).click()

    await expect(cards(page)).toHaveCount(12)
  })

  test('never shows two states at once, nor empty before results', async ({ page }) => {
    await installStateProbe(page)
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)
    await page
      .getByRole('navigation', { name: 'Pagination' })
      .getByRole('link', { name: 'Next' })
      .click()
    await expect(cards(page).first().getByRole('heading')).toHaveText('Alien Googah')

    const { log, overlap } = await readStateProbe(page)

    expect(overlap).toBe(false)
    expect(statesOf(log, '#results')).toEqual(['loading', 'ready'])
  })

  test('shows loading, not a stale empty state, when a search follows an empty one', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(LIST_URL)
    await installStateProbe(page)
    await openPage(page, '/?name=zzzz')
    await expect(page.locator('#results [data-state="empty"]')).toBeVisible()

    await page.locator('#results').getByRole('button', { name: 'Reset filters' }).click()
    await expect(cards(page)).toHaveCount(12)

    const { log, overlap } = await readStateProbe(page)
    expect(overlap).toBe(false)
    expect(statesOf(log, '#results')).toEqual(['loading', 'empty', 'loading', 'ready'])
  })
})
