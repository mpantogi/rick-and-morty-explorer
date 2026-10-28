import { useHead } from '@unhead/vue'
import { type MaybeRefOrGetter, toValue } from 'vue'

import { env, SITE } from '@/shared/config'

import { formatTitle } from './format-title'
import { truncate } from './truncate'

const DESCRIPTION_MAX = 155
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

export interface SeoImage {
  url: string
  width: number
  height: number
  alt: string
  card: 'summary' | 'summary_large_image'
}

export interface PageSeoInput {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  path?: MaybeRefOrGetter<string>
  robots?: MaybeRefOrGetter<'index' | 'noindex'>
  ogType?: 'website' | 'profile'
  image?: MaybeRefOrGetter<SeoImage | null>
  jsonLd?: MaybeRefOrGetter<Record<string, unknown> | null>
}

function defaultImage(): SeoImage {
  return {
    url: `${env.siteUrl}/og-image.png`,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: SITE.name,
    card: 'summary_large_image',
  }
}

export function usePageSeo(input: PageSeoInput): void {
  useHead(() => {
    const title = formatTitle(toValue(input.title))
    const description = truncate(toValue(input.description), DESCRIPTION_MAX)
    const path = toValue(input.path)
    const url = path === undefined ? undefined : `${env.siteUrl}${path}`
    const image = toValue(input.image) ?? defaultImage()
    const jsonLd = toValue(input.jsonLd)

    return {
      title,
      meta: [
        { name: 'description', content: description },
        { name: 'robots', content: `${toValue(input.robots) ?? 'index'},follow` },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: input.ogType ?? 'website' },
        { property: 'og:site_name', content: SITE.name },
        { property: 'og:locale', content: 'en_US' },
        ...(url === undefined ? [] : [{ property: 'og:url', content: url }]),
        { property: 'og:image', content: image.url },
        { property: 'og:image:width', content: String(image.width) },
        { property: 'og:image:height', content: String(image.height) },
        { property: 'og:image:alt', content: image.alt },
        { name: 'twitter:card', content: image.card },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: image.url },
      ],
      link: url === undefined ? [] : [{ rel: 'canonical', href: url }],
      script: jsonLd ? [{ key: 'jsonld', type: 'application/ld+json', innerHTML: jsonLd }] : [],
    }
  })
}
