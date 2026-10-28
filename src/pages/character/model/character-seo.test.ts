import { describe, expect, it } from 'vitest'

import type { CharacterView } from '@/entities/character'
import { env } from '@/shared/config'

import { buildCharacterDescription, buildCharacterJsonLd, characterPageSeo } from './character-seo'

const DESCRIPTION_MAX = 155

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
    episodeIds: Array.from({ length: 51 }, (_, index) => index + 1),
    href: '/characters/1',
    ...overrides,
  }
}

describe('buildCharacterDescription', () => {
  it('summarises status, species, places and episode count, ending with the id', () => {
    expect(buildCharacterDescription(view(), 1)).toBe(
      'Rick Sanchez: Alive Human. Origin: Earth (C-137). Last seen: Citadel of Ricks. Appears in 51 episodes. Character #1.',
    )
  })

  it('names the subspecies, unknown places and a single episode', () => {
    expect(
      buildCharacterDescription(
        view({
          name: 'Annie',
          status: 'unknown',
          type: 'Parasite',
          origin: 'unknown',
          location: 'unknown',
          episodeIds: [3],
        }),
        17,
      ),
    ).toBe(
      'Annie: Unknown Human (Parasite). Origin: Unknown. Last seen: Unknown. Appears in 1 episode. Character #17.',
    )
  })

  it('shortens a long summary to 155 characters but keeps the id that makes it unique', () => {
    const description = buildCharacterDescription(
      view({
        name: 'Giant Assassin Hidden in the Statue of Liberty',
        type: 'Superhuman (Ghost trains summoner)',
        origin: 'Earth (Replacement Dimension)',
        location: 'Earth (Replacement Dimension)',
      }),
      758,
    )

    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(description).toMatch(/… Character #758\.$/)
  })
})

describe('buildCharacterJsonLd', () => {
  it('describes the profile page, the character and the breadcrumb trail', () => {
    const url = `${env.siteUrl}/characters/1`

    expect(buildCharacterJsonLd(view(), 1)).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ProfilePage',
          '@id': url,
          url,
          name: 'Rick Sanchez (#1)',
          isPartOf: { '@id': `${env.siteUrl}/#website` },
          mainEntity: { '@id': `${url}#character` },
        },
        {
          '@type': 'Person',
          '@id': `${url}#character`,
          name: 'Rick Sanchez',
          image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
          url,
          description: 'Fictional character from the animated series Rick and Morty.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Characters', item: `${env.siteUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Rick Sanchez', item: url },
          ],
        },
      ],
    })
  })
})

describe('characterPageSeo', () => {
  it('indexes a loaded character under its own canonical URL with its avatar', () => {
    const seo = characterPageSeo({ kind: 'ready', data: view() }, 1)

    expect(seo).toMatchObject({
      title: 'Rick Sanchez (#1)',
      path: '/characters/1',
      robots: 'index',
      image: {
        url: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
        width: 300,
        height: 300,
        alt: 'Rick Sanchez',
        card: 'summary',
      },
    })
    expect(seo.jsonLd).toMatchObject({ '@graph': expect.any(Array) as unknown })
  })

  it('keeps an unknown id out of the index with no canonical URL', () => {
    expect(characterPageSeo({ kind: 'error', errorCase: 'not_found' }, 99999)).toEqual({
      title: 'Page not found',
      description: 'No character has the ID 99999.',
      path: null,
      robots: 'noindex',
      image: null,
      jsonLd: null,
    })
  })

  it.each([{ kind: 'loading' }, { kind: 'error', errorCase: 'server' }] as const)(
    'names the character by id and stays out of the index while $kind',
    (state) => {
      expect(characterPageSeo(state, 7)).toMatchObject({
        title: 'Character #7',
        path: '/characters/7',
        robots: 'noindex',
        image: null,
        jsonLd: null,
      })
    },
  )
})
