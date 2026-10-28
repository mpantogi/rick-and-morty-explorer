import type { Page } from '@playwright/test'

import { expect, openPage, test, useStoredFavorites } from './fixtures'
import { mockApi } from './support/api-mock'
import { installStateProbe, readStateProbe, statesOf } from './support/state-probe'

function favoriteNames(page: Page) {
  return page.locator('#favorites').getByRole('heading', { level: 2 })
}

function favoriteToggle(page: Page, name: string) {
  return page.getByRole('button', { name: `Favorite ${name}`, exact: true })
}

async function openFavorites(page: Page): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Favorites' })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible()
}

test.describe('favorites', { tag: '@journey' }, () => {
  test('saves characters from the list, newest first, and lists them', async ({ page }) => {
    await openPage(page, '/')
    const morty = favoriteToggle(page, 'Morty Smith')

    await favoriteToggle(page, 'Rick Sanchez').click()
    await morty.click()

    await expect(morty).toHaveAttribute('aria-pressed', 'true')
    await openFavorites(page)
    await expect(favoriteNames(page)).toHaveText(['Morty Smith', 'Rick Sanchez'])
    await expect(page.getByRole('status')).toHaveText('2 favorites')
  })

  test('saves a character from its detail page', async ({ page }) => {
    await openPage(page, '/characters/3')
    const toggle = page.getByRole('button', { name: 'Favorite', exact: true })

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await openFavorites(page)
    await expect(favoriteNames(page)).toHaveText(['Summer Smith'])
  })

  test('removes a favorite in place and moves focus to the page title', async ({ page }) => {
    await useStoredFavorites(page, ['api:4', 'api:5', 'api:1'])
    await openPage(page, '/favorites')
    await expect(favoriteNames(page)).toHaveText(['Beth Smith', 'Jerry Smith', 'Rick Sanchez'])

    await favoriteToggle(page, 'Jerry Smith').click()

    await expect(favoriteNames(page)).toHaveText(['Beth Smith', 'Rick Sanchez'])
    await expect(page.getByRole('status')).toHaveText('2 favorites')
    await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeFocused()
  })

  test('keeps favorites across a reload', async ({ page }) => {
    await openPage(page, '/')
    await favoriteToggle(page, 'Summer Smith').click()

    await page.reload()
    await expect(page.locator('#app[data-v-app]')).toBeAttached()

    await expect(favoriteToggle(page, 'Summer Smith')).toHaveAttribute('aria-pressed', 'true')
    await expect(favoriteToggle(page, 'Rick Sanchez')).toHaveAttribute('aria-pressed', 'false')
  })

  test('shows a change made in another tab without a reload', async ({ page, context }) => {
    const other = await context.newPage()
    await mockApi(other)
    await openPage(other, '/favorites')
    await expect(other.locator('#favorites [data-state="empty"]')).toBeVisible()

    await openPage(page, '/')
    await favoriteToggle(page, 'Morty Smith').click()

    await expect(other.locator('#favorites').getByRole('heading', { level: 2 })).toHaveText([
      'Morty Smith',
    ])
  })

  test('never shows two states at once, nor the empty state before the list', async ({ page }) => {
    await useStoredFavorites(page, ['api:1', 'api:2'])
    await installStateProbe(page)

    await openPage(page, '/favorites')
    await expect(favoriteNames(page)).toHaveCount(2)

    const { log, overlap } = await readStateProbe(page)
    expect(overlap).toBe(false)
    expect(statesOf(log, '#favorites')).toEqual(['loading', 'ready'])
  })

  test('invites the visitor back to the list when nothing is saved', async ({ page }) => {
    await openPage(page, '/favorites')

    await page.locator('#favorites').getByRole('link', { name: 'Browse characters' }).click()

    await expect(page).toHaveURL('/')
  })
})
