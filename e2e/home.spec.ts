import type { Page } from '@playwright/test'

import { expect, openPage, test } from './fixtures'
import {
  FIRST_LIST_PAGE_URL,
  failWith,
  holdResponses,
  LIST_URL,
  NO_MATCH_URL,
} from './support/api-mock'
import { captureAround, countChangedPixels } from './support/pixels'
import { installStateProbe, readStateProbe, statesOf } from './support/state-probe'

const SERVER_ERROR = 500
// Just inside the 300 ms pause before stale results start to fade.
const PAUSE_PROBE_MS = 250
const RICK_SEARCH_URL = /\/api\/character\?name=rick/
// A 2 px ring around a card repaints over a thousand pixels; a clipped one repaints none.
const VISIBLE_RING_PIXELS = 500
// UI page 999 starts at item 11,976, which the window asks for on API page 599.
const PAST_LAST_API_PAGE_URL = /\/api\/character\?page=599$/
// With text at 200%, the empty state outgrows this screen, so its Reset sits far below the heading.
const SHORT_PHONE_VIEWPORT = { width: 320, height: 480 }

// Safari on macOS tabs past links unless Option is held, which is how its keyboard users reach them.
function tabToLinkKey(browserName: string): string {
  return browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
}

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

interface PauseProbe {
  min: number
  done: boolean
}

// Samples the results' opacity every frame for the first windowMs after they turn busy. The window
// is timed in the page from the busy change itself, so a slow runner cannot stretch it.
function installPauseProbe(page: Page, windowMs: number): Promise<void> {
  return page.evaluate((limit) => {
    const results = document.getElementById('results')
    const probe: PauseProbe = { min: 1, done: false }
    let busyAt: number | undefined
    Object.assign(window, { pauseProbe: probe })
    new MutationObserver(() => {
      if (busyAt === undefined && results?.getAttribute('aria-busy') === 'true') {
        busyAt = performance.now()
      }
    }).observe(results ?? document.body, { attributes: true, attributeFilter: ['aria-busy'] })
    const sample = () => {
      if (busyAt !== undefined && performance.now() - busyAt >= limit) {
        probe.done = true
        return
      }
      if (busyAt !== undefined && results) {
        probe.min = Math.min(probe.min, Number(getComputedStyle(results).opacity))
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }, windowMs)
}

function readPauseProbe(page: Page): Promise<PauseProbe | undefined> {
  return page.evaluate(() => (window as Window & { pauseProbe?: PauseProbe }).pauseProbe)
}

async function pickOption(page: Page, name: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name }).click()
  await page.getByRole('listbox', { name }).getByRole('option', { name: option }).click()
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

    await page.getByRole('searchbox', { name: 'Name' }).pressSequentially('rick')

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

  test('rings the card a keyboard user tabs to', async ({ page, browserName }) => {
    await openPage(page, '/')
    const card = cards(page).first()
    await expect(card.locator('img')).toHaveJSProperty('complete', true)
    await page.getByRole('heading', { level: 2, name: 'Results' }).focus()
    const unfocused = await captureAround(card)

    await page.keyboard.press(tabToLinkKey(browserName))

    await expect(card.getByRole('link')).toBeFocused()
    const focused = await captureAround(card)
    expect(await countChangedPixels(page, unfocused, focused)).toBeGreaterThan(VISIBLE_RING_PIXELS)
  })

  for (const { path, canonical } of [
    { path: '/', canonical: '/' },
    { path: '/?page=1', canonical: '/' },
    // The router reads `%20` and `+` alike, so the mount-time rewrite keeps this URL as typed.
    { path: '/?name=Rick%20Sanchez', canonical: '/?name=Rick%20Sanchez' },
  ]) {
    test(`opens ${path} at the top of the page`, async ({ page }) => {
      await openPage(page, path)
      await expect(page).toHaveURL(canonical)
      await expect(page.locator('#results [data-state="ready"]')).toBeVisible()

      expect(await page.evaluate(() => window.scrollY)).toBe(0)
    })
  }

  for (const { filter, apply, url, total } of [
    {
      filter: 'status',
      apply: (page: Page) => pickOption(page, 'Status', 'Dead'),
      url: '/?status=dead',
      total: 18,
    },
    {
      filter: 'species',
      apply: async (page: Page) => {
        await page.getByRole('combobox', { name: 'Species' }).fill('ali')
        await page
          .getByRole('listbox', { name: 'Species' })
          .getByRole('option', { name: 'Alien' })
          .click()
      },
      url: '/?species=Alien',
      total: 19,
    },
    {
      filter: 'type',
      apply: async (page: Page) => {
        await page.getByRole('textbox', { name: 'Type' }).fill('Parasite')
        await page.getByRole('textbox', { name: 'Type' }).press('Enter')
      },
      url: '/?type=Parasite',
      total: 3,
    },
    {
      filter: 'gender',
      apply: (page: Page) => pickOption(page, 'Gender', 'Female'),
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

    await page.getByRole('button', { name: 'Species' }).click()

    await expect(
      page.getByRole('listbox', { name: 'Species' }).getByRole('option', {
        name: 'Mythological Creature',
      }),
    ).toBeVisible()
  })

  test('opens and commits a status with Space, as the keyboard pattern expects', async ({
    page,
  }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)
    await openFilters(page)
    const status = page.getByRole('combobox', { name: 'Status' })
    const list = page.getByRole('listbox', { name: 'Status' })
    await status.focus()

    await page.keyboard.press('Space')
    await expect(list).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Space')

    await expect(page).toHaveURL('/?status=alive')
    await expect(list).toBeHidden()
    await expect(status).toBeFocused()
  })

  test('resets every filter and moves focus to the results heading', async ({ page }) => {
    await openPage(page, '/?name=rick&status=alive')
    await expect(summary(page)).toHaveText('Showing 1–2 of 2 characters')

    await page.getByRole('search').getByRole('button', { name: 'Reset filters' }).click()

    await expect(page).toHaveURL('/')
    await expect(cards(page)).toHaveCount(12)
    await expect(page.getByRole('heading', { level: 2, name: 'Results' })).toBeFocused()
  })

  test('scrolls the results heading into view when a reset far down the empty state focuses it', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(NO_MATCH_URL)
    await page.setViewportSize(SHORT_PHONE_VIEWPORT)
    await openPage(page, '/?name=zzzz')
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    const heading = page.getByRole('heading', { level: 2, name: 'Results' })
    const reset = page.locator('#results').getByRole('button', { name: 'Reset filters' })
    await reset.evaluate((button) => {
      button.scrollIntoView({ block: 'end' })
    })
    await expect(heading).not.toBeInViewport()

    await reset.click()

    await expect(heading).toBeFocused()
    await expect(heading).toBeInViewport()
  })

  test('shows the empty state when nothing matches', async ({ page, consoleGuard }) => {
    consoleGuard.allowHttpErrors(NO_MATCH_URL)
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
    consoleGuard.allowHttpErrors(PAST_LAST_API_PAGE_URL)
    await openPage(page, '/?page=999')
    const region = page.locator('#results')

    await expect(region.getByText("There's no page 999.")).toBeVisible()
    await expect(region.getByText('This search has 5 pages.')).toBeVisible()
    await region.getByRole('link', { name: 'Go to the first page' }).click()

    await expect(page).toHaveURL('/')
    await expect(cards(page)).toHaveCount(12)
  })

  test('keeps a page past the last one out of the index, canonical to the home page', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(PAST_LAST_API_PAGE_URL)
    await openPage(page, '/?page=999')
    await expect(page.locator('#results').getByText("There's no page 999.")).toBeVisible()

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /^https:\/\/[^/?#]+\/$/,
    )
  })

  test('reports an API failure in place and recovers with Try again', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(FIRST_LIST_PAGE_URL)
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

  test('fades the stale results while a slow search loads, then restores them', async ({
    page,
  }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)
    const release = await holdResponses(page, RICK_SEARCH_URL)

    await page.getByRole('searchbox', { name: 'Name' }).fill('rick')

    await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'true')
    await expect(page.locator('#results')).toHaveCSS('opacity', '0.6')
    release()
    await expect(summary(page)).toHaveText('Showing 1–7 of 7 characters')
    await expect(page.locator('#results')).toHaveCSS('opacity', '1')
  })

  test('never fades the results while an update is still inside the pause', async ({ page }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)
    const release = await holdResponses(page, RICK_SEARCH_URL)
    await installPauseProbe(page, PAUSE_PROBE_MS)

    await page.getByRole('searchbox', { name: 'Name' }).fill('rick')
    await expect.poll(async () => (await readPauseProbe(page))?.done).toBe(true)

    expect((await readPauseProbe(page))?.min).toBe(1)
    release()
    await expect(summary(page)).toHaveText('Showing 1–7 of 7 characters')
  })

  test('shows loading, not a stale empty state, when a search follows an empty one', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(NO_MATCH_URL)
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
