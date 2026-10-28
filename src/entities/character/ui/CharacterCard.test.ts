import { fireEvent, screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import { renderWithApp } from '../../../../test/render'
import type { CharacterView } from '../model/types'
import CharacterCard from './CharacterCard.vue'

function view(overrides: Partial<CharacterView> = {}): CharacterView {
  return {
    key: 'api:2',
    source: 'api',
    name: 'Morty Smith',
    status: 'alive',
    species: 'Human',
    type: '',
    gender: 'male',
    image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg',
    origin: 'unknown',
    location: 'Citadel of Ricks',
    episodeIds: [1, 2],
    href: '/characters/2',
    ...overrides,
  }
}

function avatarOf(container: Element): HTMLImageElement {
  const image = container.querySelector('img')
  if (!image) throw new Error('The card rendered no avatar image')
  return image
}

async function renderCard(character: CharacterView, flags: Record<string, boolean> = {}) {
  const rendered = await renderWithApp(CharacterCard, { props: { character, ...flags } })
  return { ...rendered, card: within(screen.getByRole('article')) }
}

describe('CharacterCard', () => {
  it('links the name to the detail page as its only interactive element', async () => {
    const { card } = await renderCard(view())

    expect(card.getAllByRole('link')).toEqual([card.getByRole('link', { name: 'Morty Smith' })])
    expect(card.getByRole('link')).toHaveAttribute('href', '/characters/2')
    expect(card.queryAllByRole('button')).toEqual([])
  })

  it('heads the card with a level-3 heading under the results heading', async () => {
    const { card } = await renderCard(view())

    expect(card.getByRole('heading', { level: 3, name: 'Morty Smith' })).toBeInTheDocument()
  })

  it('names the status in text next to the species', async () => {
    const { card } = await renderCard(view({ status: 'dead', species: 'Alien' }))

    expect(card.getByText('Dead')).toHaveClass('status-badge')
    expect(card.getByText(/Alien/)).toBeInTheDocument()
  })

  it('shows the last known location and Unknown for unknown values', async () => {
    const { card } = await renderCard(view({ species: 'unknown', location: 'unknown' }))

    expect(card.getByText('Last known location')).toBeInTheDocument()
    expect(card.getAllByText(/Unknown/)).toHaveLength(2)
  })

  it('leaves the subspecies to the detail page', async () => {
    const { card } = await renderCard(view({ type: 'Parasite' }))

    expect(card.queryByText(/Parasite/)).not.toBeInTheDocument()
  })

  it('treats the avatar as decoration, lazy-loaded at its intrinsic size', async () => {
    const { container } = await renderCard(view())
    const image = avatarOf(container)

    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('width', '300')
    expect(image).toHaveAttribute('height', '300')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('fetchpriority', 'auto')
  })

  it('loads the avatar at once, with high priority, when asked', async () => {
    const { container } = await renderCard(view(), { eager: true, priority: true })
    const image = avatarOf(container)

    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('fetchpriority', 'high')
  })

  it('swaps an avatar that fails to load for a placeholder of the same size', async () => {
    const { container } = await renderCard(view())

    await fireEvent.error(avatarOf(container))

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('.avatar--fallback')).toHaveAttribute('aria-hidden', 'true')
  })
})
