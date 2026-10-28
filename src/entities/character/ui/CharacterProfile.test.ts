import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import { renderWithApp } from '../../../../test/render'
import type { CharacterView } from '../model/types'
import CharacterProfile from './CharacterProfile.vue'

function view(overrides: Partial<CharacterView> = {}): CharacterView {
  return {
    key: 'api:1',
    source: 'api',
    name: 'Rick Sanchez',
    status: 'alive',
    species: 'Human',
    type: '',
    gender: 'male',
    image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
    origin: 'Earth (C-137)',
    location: 'Citadel of Ricks',
    episodeIds: [1, 2],
    href: '/characters/1',
    ...overrides,
  }
}

// Reads the description list as term → shown value pairs.
function facts(): Record<string, string> {
  const terms = screen.getAllByRole('term')
  return Object.fromEntries(
    terms.map((term) => [
      term.textContent.trim(),
      term.nextElementSibling?.textContent.replaceAll(/\s+/g, ' ').trim() ?? '',
    ]),
  )
}

describe('CharacterProfile', () => {
  it('heads the page with the name as the focus target for route changes', async () => {
    await renderWithApp(CharacterProfile, { props: { character: view() } })

    const heading = screen.getByRole('heading', { level: 1, name: 'Rick Sanchez' })
    expect(heading).toHaveAttribute('id', 'page-title')
    expect(heading).toHaveAttribute('tabindex', '-1')
  })

  it('lists every fact in order, with None for an empty type', async () => {
    await renderWithApp(CharacterProfile, { props: { character: view() } })

    expect(facts()).toEqual({
      Status: 'Alive',
      Species: 'Human',
      Type: 'None',
      Gender: 'Male',
      Origin: 'Earth (C-137)',
      'Last known location': 'Citadel of Ricks',
    })
    expect(Object.keys(facts())).toEqual([
      'Status',
      'Species',
      'Type',
      'Gender',
      'Origin',
      'Last known location',
    ])
    expect(screen.getByText('None')).toHaveClass('text-muted')
  })

  it('shows Unknown for unknown values and the subspecies when there is one', async () => {
    await renderWithApp(CharacterProfile, {
      props: {
        character: view({
          status: 'unknown',
          species: 'unknown',
          type: 'Parasite',
          gender: 'unknown',
          origin: 'unknown',
          location: 'unknown',
        }),
      },
    })

    expect(facts()).toEqual({
      Status: 'Unknown',
      Species: 'Unknown',
      Type: 'Parasite',
      Gender: 'Unknown',
      Origin: 'Unknown',
      'Last known location': 'Unknown',
    })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('names the avatar after the character and loads it first', async () => {
    await renderWithApp(CharacterProfile, { props: { character: view() } })

    const avatar = screen.getByRole('img', { name: 'Rick Sanchez' })
    expect(avatar).toHaveAttribute('loading', 'eager')
    expect(avatar).toHaveAttribute('fetchpriority', 'high')
    expect(avatar).not.toHaveAttribute('referrerpolicy')
  })

  it('sends no referrer when it loads a hero image from an outside host', async () => {
    await renderWithApp(CharacterProfile, {
      props: { character: view({ source: 'hero', image: 'https://example.com/hero.png' }) },
    })

    expect(screen.getByRole('img', { name: 'Rick Sanchez' })).toHaveAttribute(
      'referrerpolicy',
      'no-referrer',
    )
  })

  it('places the actions the page passes in under the name', async () => {
    await renderWithApp(CharacterProfile, {
      props: { character: view() },
      slots: { actions: '<button type="button">Favorite</button>' },
    })

    expect(screen.getByRole('button', { name: 'Favorite' })).toBeInTheDocument()
  })
})
