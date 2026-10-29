import { AVATAR_SIZE, type CharacterView, displayValue, statusLabel } from '@/entities/character'
import { env, paths, SITE } from '@/shared/config'
import { type AsyncState, DESCRIPTION_MAX, type SeoImage, truncate } from '@/shared/lib'

const PERSON_DESCRIPTION = 'Fictional character from the animated series Rick and Morty.'

export interface CharacterPageSeo {
  title: string
  description: string
  path: string | null
  robots: 'index' | 'noindex'
  image: SeoImage | null
  jsonLd: Record<string, unknown> | null
}

function characterTitle(character: CharacterView, id: number): string {
  return `${character.name} (#${id})`
}

export function episodeCount(count: number): string {
  return `${count} episode${count === 1 ? '' : 's'}`
}

// 46 names are shared by several characters, so the id closes every description to keep it unique.
export function buildCharacterDescription(character: CharacterView, id: number): string {
  const subspecies = character.type ? ` (${character.type})` : ''
  const summary =
    `${character.name}: ${statusLabel(character.status)} ${displayValue(character.species)}${subspecies}. ` +
    `Origin: ${displayValue(character.origin)}. Last seen: ${displayValue(character.location)}. ` +
    `Appears in ${episodeCount(character.episodeIds.length)}.`
  const suffix = ` Character #${id}.`
  return `${truncate(summary, DESCRIPTION_MAX - suffix.length)}${suffix}`
}

export function buildCharacterJsonLd(
  character: CharacterView,
  id: number,
): Record<string, unknown> {
  const url = `${env.siteUrl}${paths.character(id)}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': url,
        url,
        name: characterTitle(character, id),
        isPartOf: { '@id': `${env.siteUrl}/#website` },
        mainEntity: { '@id': `${url}#character` },
      },
      {
        '@type': 'Person',
        '@id': `${url}#character`,
        name: character.name,
        image: character.image,
        url,
        description: PERSON_DESCRIPTION,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Characters', item: `${env.siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: character.name, item: url },
        ],
      },
    ],
  }
}

function readySeo(character: CharacterView, id: number): CharacterPageSeo {
  return {
    title: characterTitle(character, id),
    description: buildCharacterDescription(character, id),
    path: paths.character(id),
    robots: 'index',
    image: {
      url: character.image,
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      alt: character.name,
      card: 'summary',
    },
    jsonLd: buildCharacterJsonLd(character, id),
  }
}

// Prerendered pages are always ready; the other states only exist in the browser.
export function characterPageSeo(state: AsyncState<CharacterView>, id: number): CharacterPageSeo {
  if (state.kind === 'ready') return readySeo(state.data, id)
  if (state.kind === 'error' && state.errorCase === 'not_found') {
    return {
      title: 'Page not found',
      description: `No character has the ID ${id}.`,
      path: null,
      robots: 'noindex',
      image: null,
      jsonLd: null,
    }
  }
  return {
    title: `Character #${id}`,
    description: `Character #${id} in ${SITE.name}.`,
    path: paths.character(id),
    robots: 'noindex',
    image: null,
    jsonLd: null,
  }
}
