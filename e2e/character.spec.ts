import type { APIRequestContext, Page } from '@playwright/test'
import { z } from 'zod'

import { expect, openPage, test } from './fixtures'
import { EPISODES_URL, failWith, trackApiCalls } from './support/api-mock'
import { installStateProbe, readStateProbe, statesOf } from './support/state-probe'

const SERVER_ERROR = 500
// Morty Smith in e2e/support/api-fixture.json, which client navigation reads.
const MORTY_FIXTURE_EPISODES = 51
const STATE_SCRIPT = /<script>window\.__INITIAL_STATE__=("[^<]*")<\/script>/
const dehydratedSchema = z.object({
  vueQuery: z.object({
    queries: z.array(
      z.object({ queryKey: z.array(z.unknown()), state: z.object({ data: z.unknown() }) }),
    ),
  }),
})
const characterSchema = z.object({ id: z.number(), episode: z.array(z.string()) })

// A prerendered page carries live API data, so its episode count comes from its own embedded state.
async function prerenderedEpisodeCount(request: APIRequestContext, id: number): Promise<number> {
  const html = await (await request.get(`/characters/${String(id)}`)).text()
  const literal = STATE_SCRIPT.exec(html)?.[1]
  if (literal === undefined) throw new Error(`/characters/${String(id)} embeds no state`)
  const state = dehydratedSchema.parse(JSON.parse(z.string().parse(JSON.parse(literal))))
  const detail = state.vueQuery.queries.find(({ queryKey }) => queryKey[1] === 'detail')
  return characterSchema.parse(detail?.state.data).episode.length
}

function facts(page: Page) {
  return page.locator('.character-profile__facts')
}

async function openFromList(page: Page, path: string, name: string): Promise<void> {
  await openPage(page, path)
  await page.locator('#results').getByRole('link', { name, exact: true }).click()
}

test.describe('character detail', { tag: '@journey' }, () => {
  test('renders the prerendered profile and episodes without asking the API', async ({
    page,
    request,
  }) => {
    const episodes = await prerenderedEpisodeCount(request, 1)
    const apiCalls = trackApiCalls(page)

    await openPage(page, '/characters/1')

    await expect(page.getByRole('heading', { level: 1, name: 'Rick Sanchez' })).toBeVisible()
    await expect(facts(page).getByText('Alive')).toBeVisible()
    await expect(facts(page).getByText('None')).toBeVisible()
    await expect(facts(page).getByText('Earth (C-137)')).toBeVisible()
    expect(episodes).toBeGreaterThan(1)
    await expect(page.getByText(`Appears in ${String(episodes)} episodes`)).toBeVisible()
    await expect(page.locator('#episodes').getByRole('listitem')).toHaveCount(episodes)
    await expect(page.locator('#episodes time').first()).toHaveAttribute('datetime', '2013-12-02')
    expect(apiCalls).toEqual([])
  })

  test('opens from a card in the list with the name focused', async ({ page }) => {
    await openFromList(page, '/', 'Morty Smith')

    await expect(page).toHaveURL('/characters/2')
    await expect(page.getByRole('heading', { level: 1, name: 'Morty Smith' })).toBeFocused()
    await expect(page.locator('#episodes').getByRole('listitem')).toHaveCount(
      MORTY_FIXTURE_EPISODES,
    )
  })

  test('returns to the filtered list it came from', async ({ page }) => {
    await openFromList(page, '/?name=rick', 'Rick Sanchez')
    await expect(page.getByRole('heading', { level: 1, name: 'Rick Sanchez' })).toBeVisible()

    await page.getByRole('link', { name: 'Back to characters' }).click()

    await expect(page).toHaveURL('/?name=rick')
    await expect(page.getByRole('region', { name: 'Results' }).getByRole('status')).toHaveText(
      'Showing 1–7 of 7 characters',
    )
  })

  test('shows one state per region while it loads after client navigation', async ({ page }) => {
    await installStateProbe(page)

    await openFromList(page, '/', 'Summer Smith')
    await expect(page.locator('#episodes [data-state="ready"]')).toBeVisible()

    const { log, overlap } = await readStateProbe(page)
    expect(overlap).toBe(false)
    expect(statesOf(log, '#profile')).toEqual(['ready'])
    expect(statesOf(log, '#episodes')).toEqual(['loading', 'ready'])
  })

  test('answers an unknown id with the not-found view', async ({ page, consoleGuard }) => {
    consoleGuard.allowHttpErrors(/\/characters\/99999$/, /\/api\/character\/99999$/)

    const response = await openPage(page, '/characters/99999')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { level: 1, name: "Wrong dimension. We couldn't find this page." }),
    ).toBeVisible()
    await expect(page.getByText('No character has the ID 99999.')).toBeVisible()
    await expect(page).toHaveTitle('Page not found | Rick and Morty Explorer')
  })

  test('keeps the profile when the episodes fail, and reports it in place', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowHttpErrors(EPISODES_URL)
    await page.route(EPISODES_URL, failWith(SERVER_ERROR))

    await openFromList(page, '/', 'Beth Smith')

    const episodes = page.locator('#episodes')
    await expect(episodes.getByText("Couldn't load episodes.")).toBeVisible()
    await expect(episodes.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Beth Smith' })).toBeVisible()
    await expect(
      page.getByText("The Rick and Morty API isn't responding", { exact: true }),
    ).toBeVisible()
  })
})
