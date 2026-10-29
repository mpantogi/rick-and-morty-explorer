import type { Page } from '@playwright/test'

import { expect, openPage, test, useStoredHeroes } from './fixtures'
import { PORTAL_PETE } from './support/heroes'
import { installStateProbe, readStateProbe, statesOf } from './support/state-probe'

// The API mock serves IMAGE, an avatar; BROKEN_IMAGE is answered with a 404 in its own test.
const IMAGE = 'https://rickandmortyapi.com/api/character/avatar/7.jpeg'
const BROKEN_IMAGE = 'https://images.example.com/missing.png'
const INSECURE_IMAGE = 'http://example.com/pete.png'
const NOT_FOUND = 404
const SECURE_URL_ERROR = 'Enter a secure image URL: https:// and a domain name, not an IP address.'
const UNKNOWN_HERO_PATH = '/heroes/0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d'

function form(page: Page) {
  return {
    name: page.getByRole('textbox', { name: 'Name' }),
    image: page.getByRole('textbox', { name: 'Image URL' }),
    gender: page.getByRole('group', { name: 'Gender' }),
    submit: page.getByRole('button', { name: 'Create hero' }),
  }
}

function firstCard(page: Page) {
  return page.locator('#results').getByRole('article').first()
}

async function createHero(page: Page, image = IMAGE): Promise<void> {
  const fields = form(page)
  await fields.name.fill('Portal Pete')
  await fields.gender.getByRole('radio', { name: 'Male', exact: true }).check()
  await fields.image.fill(image)
}

test.describe('create hero', { tag: '@journey' }, () => {
  test('flags every empty field on submit and focuses the first one', async ({ page }) => {
    await openPage(page, '/heroes/new')
    const fields = form(page)

    await fields.submit.click()

    await expect(fields.name).toBeFocused()
    await expect(fields.name).toHaveAttribute('aria-invalid', 'true')
    await expect(fields.name).toHaveAccessibleDescription('2 to 60 characters. Enter a name.')
    await expect(fields.name).toHaveAccessibleErrorMessage('Enter a name.')
    await expect(fields.gender.getByRole('radio').first()).toHaveAccessibleErrorMessage(
      'Choose a gender.',
    )
    await expect(fields.image).toHaveAccessibleErrorMessage('Enter an image URL.')
    await expect(page).toHaveURL('/heroes/new')
  })

  test('refuses an image address that is not a secure web address', async ({ page }) => {
    await openPage(page, '/heroes/new')
    const fields = form(page)
    const preview = page.getByRole('figure', { name: 'Preview' })

    for (const address of ['javascript:alert(1)', INSECURE_IMAGE]) {
      await fields.image.fill(address)
      await fields.submit.click()

      // A settled submit focuses the first invalid field; a later fill must not race that focus.
      await expect(fields.name).toBeFocused()
      await expect(fields.image).toHaveAccessibleErrorMessage(SECURE_URL_ERROR)
    }

    // Only the schema brings the empty state back over a shown image; a failed load shows a fallback.
    await fields.image.fill(IMAGE)
    await expect(preview.locator('img')).toHaveAttribute('src', IMAGE)
    await fields.image.fill(INSECURE_IMAGE)
    await expect(preview.getByText('Your image will appear here.')).toBeVisible()
    await expect(preview.locator('img')).toHaveCount(0)
  })

  test('creates a hero that leads the character list, even after a reload', async ({ page }) => {
    await openPage(page, '/heroes/new')
    await createHero(page)
    await expect(page.getByRole('figure', { name: 'Preview' }).locator('img')).toHaveAttribute(
      'src',
      IMAGE,
    )

    await form(page).submit.click()

    await expect(page).toHaveURL('/')
    await expect(page.getByText('Hero created', { exact: true })).toBeVisible()
    await expect(page.getByText('Portal Pete is now first in the character list.')).toBeVisible()
    await expect(firstCard(page).getByRole('heading')).toHaveText('Portal Pete')
    await expect(firstCard(page).getByText('Your hero')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Results' }).getByRole('status')).toHaveText(
      'Showing 1–12 of 61 characters',
    )

    await page.reload()

    await expect(firstCard(page).getByRole('heading')).toHaveText('Portal Pete')
  })

  test('explains a preview that cannot load, and still creates the hero', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(/\/missing\.png$/)
    await page.route(BROKEN_IMAGE, (route) => route.fulfill({ status: NOT_FOUND }))
    await openPage(page, '/heroes/new')

    await createHero(page, BROKEN_IMAGE)

    const preview = page.getByRole('figure', { name: 'Preview' })
    await expect(preview.getByRole('status')).toHaveText(
      "We couldn't load this image. You can still create the hero, and a placeholder will show instead.",
    )
    await expect(preview.locator('img')).toHaveCount(0)
    await form(page).submit.click()
    await expect(firstCard(page).getByRole('heading')).toHaveText('Portal Pete')
  })

  test("opens a hero's own page from its card", async ({ page }) => {
    await useStoredHeroes(page, [PORTAL_PETE])
    await openPage(page, '/')

    await firstCard(page).getByRole('link', { name: 'Portal Pete' }).click()

    await expect(page).toHaveURL(`/heroes/${PORTAL_PETE.id}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Portal Pete' })).toBeFocused()
    await expect(page.getByText("You created this hero. It's saved in this browser.")).toBeVisible()
    await expect(page).toHaveTitle('Portal Pete (your hero) | Rick and Morty Explorer')
  })

  test('serves a hero page from the prerendered shell, one state at a time', async ({ page }) => {
    await useStoredHeroes(page, [PORTAL_PETE])
    await installStateProbe(page)

    const response = await openPage(page, `/heroes/${PORTAL_PETE.id}`)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Portal Pete' })).toBeVisible()
    const { log, overlap } = await readStateProbe(page)
    expect(overlap).toBe(false)
    expect(statesOf(log, '#profile')).toEqual(['loading', 'ready'])
  })

  test('favorites a hero from the list and its own page, and keeps it', async ({ page }) => {
    await useStoredHeroes(page, [PORTAL_PETE])
    await openPage(page, '/')
    const listToggle = page.getByRole('button', { name: 'Favorite Portal Pete', exact: true })

    await listToggle.click()
    await expect(listToggle).toHaveAttribute('aria-pressed', 'true')
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Favorites' })
      .click()

    const favorites = page.locator('#favorites')
    await expect(favorites.getByRole('heading', { level: 2 })).toHaveText(['Portal Pete'])
    await expect(favorites.getByText('Your hero')).toBeVisible()
    await page.reload()
    await expect(favorites.getByRole('heading', { level: 2 })).toHaveText(['Portal Pete'])

    await favorites.getByRole('link', { name: 'Portal Pete' }).click()
    const profileToggle = page.getByRole('button', { name: 'Favorite', exact: true })
    await expect(profileToggle).toHaveAttribute('aria-pressed', 'true')
    await profileToggle.click()
    await expect(profileToggle).toHaveAttribute('aria-pressed', 'false')
  })

  test('explains that a hero from another browser is not saved here', async ({ page }) => {
    const response = await openPage(page, UNKNOWN_HERO_PATH)

    // The shell answers every hero URL; only the browser knows whether the hero exists.
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { level: 1, name: "Wrong dimension. We couldn't find this page." }),
    ).toBeVisible()
    await expect(
      page.getByText(
        "Heroes are saved in the browser where you created them. This one isn't saved here.",
      ),
    ).toBeVisible()
    await expect(page).toHaveTitle('Page not found | Rick and Morty Explorer')
  })

  test('answers a deeper hero path with a real 404', async ({ page, consoleGuard }) => {
    consoleGuard.allowHttpErrors(/\/heroes\/a\/b$/)

    const response = await openPage(page, '/heroes/a/b')

    expect(response?.status()).toBe(NOT_FOUND)
    await expect(
      page.getByRole('heading', { level: 1, name: "Wrong dimension. We couldn't find this page." }),
    ).toBeVisible()
  })
})
