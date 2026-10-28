import type { Locator, Page } from '@playwright/test'

import { expect, openPage, test } from './fixtures'

// Generous: the home page has about 40 tab stops before the pagination.
const MAX_TABS = 60
// From the skip link through the header, the filters and the first cards.
const RING_CHECK_TABS = 30

interface FocusStop {
  element: string
  hasRing: boolean
}

function cards(page: Page) {
  return page.locator('#results').getByRole('article')
}

// Presses Tab until the target holds focus; never reaching it fails the test.
async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let presses = 0; presses < MAX_TABS; presses += 1) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error(`Tab never reached ${String(target)} in ${String(MAX_TABS)} presses`)
}

// The focused element shows a ring on itself or, for a stretched card link, on its ::after box.
function focusStop(page: Page): Promise<FocusStop> {
  return page.evaluate(() => {
    const element = document.activeElement
    const hasOutline = (style: CSSStyleDeclaration) =>
      style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0
    if (!(element instanceof HTMLElement)) return { element: 'nothing', hasRing: false }
    // Form controls have no text of their own, so their id tells them apart.
    const label = [element.getAttribute('aria-label') ?? '', element.textContent.trim(), element.id]
    return {
      element: `${element.tagName.toLowerCase()} "${label.find((text) => text !== '') ?? ''}"`,
      hasRing:
        hasOutline(getComputedStyle(element)) || hasOutline(getComputedStyle(element, '::after')),
    }
  })
}

test.describe('keyboard', () => {
  test('skips to the main content from the first Tab', async ({ page }) => {
    await openPage(page, '/')

    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()
    await page.keyboard.press('Enter')

    await expect(page.locator('#main')).toBeFocused()
  })

  test('searches by name without a pointer', async ({ page }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)

    await tabTo(page, page.getByRole('searchbox', { name: 'Name' }))
    await page.keyboard.type('rick')

    await expect(page).toHaveURL('/?name=rick')
    await expect(page.getByRole('region', { name: 'Results' }).getByRole('status')).toHaveText(
      'Showing 1–7 of 7 characters',
    )
  })

  test('opens a character from its card with Enter and lands on its name', async ({ page }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)

    await tabTo(page, cards(page).first().getByRole('link', { name: 'Rick Sanchez' }))
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL('/characters/1')
    await expect(page.getByRole('heading', { level: 1, name: 'Rick Sanchez' })).toBeFocused()
  })

  test('toggles a favorite with Space', async ({ page }) => {
    await openPage(page, '/characters/1')
    const toggle = page.getByRole('button', { name: 'Favorite', exact: true })

    await tabTo(page, toggle)
    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Space')

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  test('shows a visible focus ring on every element it reaches', async ({ page }) => {
    await openPage(page, '/')
    await expect(cards(page)).toHaveCount(12)

    const stops: FocusStop[] = []
    for (let presses = 0; presses < RING_CHECK_TABS; presses += 1) {
      await page.keyboard.press('Tab')
      stops.push(await focusStop(page))
    }

    expect(stops.filter((stop) => !stop.hasRing)).toEqual([])
    expect(new Set(stops.map((stop) => stop.element)).size).toBe(RING_CHECK_TABS)
  })
})
