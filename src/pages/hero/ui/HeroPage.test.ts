import { screen, within } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/shared/config'

import { renderWithApp } from '../../../../test/render'
import HeroPage from './HeroPage.vue'

const PETE = {
  id: '6c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  name: 'Portal Pete',
  gender: 'genderless',
  image: 'https://example.com/pete.png',
  createdAt: '2026-10-28T12:00:00.000Z',
}
const UNKNOWN_HERO = '0b4f3a52-8f1e-4a5b-9c7d-2e6f1a3b4c5d'
const NOT_SAVED_HERE =
  "Heroes are saved in the browser where you created them. This one isn't saved here."

function saveHeroes(heroes: readonly object[]): void {
  localStorage.setItem(STORAGE_KEYS.heroes, JSON.stringify(heroes))
}

async function renderPage(id: string) {
  const rendered = await renderWithApp(HeroPage, { route: `/heroes/${id}`, props: { id } })
  const profile = () => rendered.container.querySelector<HTMLElement>('#profile')
  return { ...rendered, profile }
}

function expectNotFound(): void {
  expect(
    screen.getByRole('heading', { level: 1, name: "Wrong dimension. We couldn't find this page." }),
  ).toBeInTheDocument()
  expect(screen.getByText(NOT_SAVED_HERE)).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
}

describe('HeroPage', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("shows a saved hero's profile, with unknown for what the form never asked", async () => {
    saveHeroes([PETE])
    const { profile } = await renderPage(PETE.id)

    expect(screen.getByRole('heading', { level: 1, name: 'Portal Pete' })).toBeInTheDocument()
    const facts = within(profile() ?? document.body)
    expect(facts.getByText('Genderless')).toBeInTheDocument()
    expect(facts.getByText('None')).toBeInTheDocument()
    expect(facts.getAllByText('Unknown')).toHaveLength(4)
    expect(screen.getByRole('img', { name: 'Portal Pete' })).toHaveAttribute(
      'referrerpolicy',
      'no-referrer',
    )
    expect(
      screen.getByText("You created this hero. It's saved in this browser."),
    ).toBeInTheDocument()
    expect(profile()?.querySelectorAll('[data-state]')).toHaveLength(1)
    expect(profile()?.querySelector('[data-state]')).toHaveAttribute('data-state', 'ready')
  })

  it('leads back to the list through the back link and the breadcrumb trail', async () => {
    saveHeroes([PETE])
    await renderPage(PETE.id)

    expect(screen.getByRole('link', { name: 'Back to characters' })).toHaveAttribute('href', '/')
    const trail = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(trail.getByRole('link', { name: 'Characters' })).toHaveAttribute('href', '/')
    expect(trail.getByText('Portal Pete')).toHaveAttribute('aria-current', 'page')
  })

  it('saves the hero as a favorite with the labelled toggle', async () => {
    saveHeroes([PETE])
    const { user } = await renderPage(PETE.id)
    const toggle = screen.getByRole('button', { name: 'Favorite' })

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) ?? '[]')).toEqual([
      `hero:${PETE.id}`,
    ])
  })

  it('names the page after the hero and keeps it out of search results', async () => {
    saveHeroes([PETE])
    await renderPage(PETE.id)

    await vi.waitFor(() => {
      expect(document.title).toBe('Portal Pete (your hero) | Rick and Morty Explorer')
    })
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex,follow',
    )
  })

  it('explains that a hero created in another browser is not saved here', async () => {
    saveHeroes([PETE])
    const { profile } = await renderPage(UNKNOWN_HERO)

    expectNotFound()
    expect(profile()?.querySelector('[data-state]')).toHaveAttribute('data-state', 'error')
  })

  it.each(['shell', 'not-a-uuid', `${PETE.id}0`])('treats the id %j as not found', async (id) => {
    saveHeroes([PETE])
    await renderPage(id)

    expectNotFound()
    expect(screen.queryByText('Portal Pete')).not.toBeInTheDocument()
  })

  it('holds the place of the profile while prerendering, as no hero exists there', async () => {
    vi.stubEnv('SSR', true)
    const { profile } = await renderPage('shell')

    expect(profile()?.querySelectorAll('[data-state]')).toHaveLength(1)
    expect(profile()?.querySelector('[data-state]')).toHaveAttribute('data-state', 'loading')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Loading character…' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.queryByText(NOT_SAVED_HERE)).not.toBeInTheDocument()
  })
})
