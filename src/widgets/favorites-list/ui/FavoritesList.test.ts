import { screen, within } from '@testing-library/vue'
import { http } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { STORAGE_KEYS } from '@/shared/config'

import { API, apiJson } from '../../../../test/msw/handlers'
import { recordRequests, server } from '../../../../test/msw/server'
import { renderWithApp } from '../../../../test/render'
import FavoritesList from './FavoritesList.vue'

// The page title is the focus target once a removed card takes its button with it.
const PageWithList = defineComponent({
  setup: () => () => [h('h1', { id: 'page-title', tabindex: -1 }, 'Favorites'), h(FavoritesList)],
})

function saveFavorites(keys: readonly string[]): void {
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(keys))
}

async function setup() {
  const rendered = await renderWithApp(PageWithList, { route: '/favorites' })
  const region = () =>
    within(rendered.container.querySelector<HTMLElement>('#favorites') ?? document.body)
  const status = () => screen.getByRole('status')
  return { ...rendered, region, status }
}

function cardNames(): string[] {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent.trim())
}

describe('FavoritesList', () => {
  it('invites the visitor to browse when nothing is saved, with no count', async () => {
    const { region, status, container } = await setup()

    expect(container.querySelectorAll('#favorites [data-state]')).toHaveLength(1)
    expect(region().getByText('No favorites yet.')).toBeInTheDocument()
    expect(
      region().getByText('Use the heart on any character to save it here.'),
    ).toBeInTheDocument()
    expect(region().getByRole('link', { name: 'Browse characters' })).toHaveAttribute('href', '/')
    expect(status()).toHaveTextContent('')
  })

  it('reserves the list with one skeleton card per saved favorite while it loads', async () => {
    saveFavorites(['api:1', 'api:2', 'api:3'])
    const { container, status } = await setup()

    expect(container.querySelectorAll('#favorites [data-state]')).toHaveLength(1)
    expect(container.querySelector('#favorites [data-state="loading"]')).toBeInTheDocument()
    expect(container.querySelectorAll('.character-card-skeleton')).toHaveLength(3)
    expect(status()).toHaveTextContent('Loading favorites…')

    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(3)
    })
  })

  it('caps the skeleton at one screenful of cards', async () => {
    saveFavorites(Array.from({ length: 20 }, (_, index) => `api:${String(index + 1)}`))
    const { container } = await setup()

    expect(container.querySelectorAll('.character-card-skeleton')).toHaveLength(12)

    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(20)
    })
  })

  it('lists the saved characters newest first under level-2 headings, with the count', async () => {
    saveFavorites(['api:4', 'api:1'])
    const { status, container } = await setup()

    await vi.waitFor(() => {
      expect(cardNames()).toEqual(['Beth Smith', 'Rick Sanchez'])
    })
    expect(container.querySelectorAll('#favorites [data-state]')).toHaveLength(1)
    expect(status()).toHaveTextContent('2 favorites')
  })

  it('lists a favorited created hero, tagged as yours, beside API characters', async () => {
    const hero = {
      id: '6c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
      name: 'Portal Pete',
      gender: 'male',
      image: 'https://example.com/pete.png',
      createdAt: '2026-10-28T12:00:00.000Z',
    }
    localStorage.setItem(STORAGE_KEYS.heroes, JSON.stringify([hero]))
    saveFavorites([`hero:${hero.id}`, 'api:1'])
    const { status } = await setup()

    await vi.waitFor(() => {
      expect(cardNames()).toEqual(['Portal Pete', 'Rick Sanchez'])
    })
    const heroCard = within(screen.getAllByRole('article')[0] ?? document.body)
    expect(heroCard.getByText('Your hero')).toBeInTheDocument()
    expect(heroCard.getByRole('link', { name: 'Portal Pete' })).toHaveAttribute(
      'href',
      `/heroes/${hero.id}`,
    )
    expect(status()).toHaveTextContent('2 favorites')
  })

  it('removes a card in place, updates the count and moves focus to the page title', async () => {
    saveFavorites(['api:4', 'api:1'])
    const { user, status, container } = await setup()
    await vi.waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(2)
    })
    const paths = recordRequests()
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')

    await user.click(screen.getByRole('button', { name: 'Favorite Beth Smith' }))

    expect(cardNames()).toEqual(['Rick Sanchez'])
    expect(status()).toHaveTextContent(/^1 favorite$/)
    expect(screen.getByRole('heading', { level: 1, name: 'Favorites' })).toHaveFocus()
    // Focus moves to the title, but the visitor stays where they were in a long list.
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
    expect(container.querySelector('#favorites')).toHaveAttribute('aria-busy', 'false')
    await new Promise((resolve) => setTimeout(resolve))
    expect(paths).toEqual([])
  })

  it('shows the failure in place with a retry that refetches', async () => {
    saveFavorites(['api:1'])
    server.use(
      http.get(`${API}/character/:ids`, () => apiJson({ error: 'boom' }, 500), { once: true }),
    )
    const { user, region, status, container } = await setup()

    await vi.waitFor(() => {
      expect(region().getByText("Couldn't load favorites.")).toBeInTheDocument()
    })
    expect(container.querySelector('[data-state="loading"]')).not.toBeInTheDocument()
    expect(container.querySelectorAll('#favorites [data-state]')).toHaveLength(1)
    expect(status()).toHaveTextContent('')

    await user.click(region().getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Favorites' })).toHaveFocus()
    await vi.waitFor(() => {
      expect(cardNames()).toEqual(['Rick Sanchez'])
    })
  })
})
