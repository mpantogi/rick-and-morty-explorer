import { z } from '@/shared/zod'

import { GENDERS } from './types'

const NAME_MIN = 2
export const HERO_NAME_MAX = 60
const IMAGE_URL_MAX = 2048

export const HERO_NAME_HINT = `${String(NAME_MIN)} to ${String(HERO_NAME_MAX)} characters.`

// One schema for the form and for every read from storage. Keys follow the form's field order.
export const heroInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name.')
    .min(NAME_MIN, `Use at least ${String(NAME_MIN)} characters.`)
    .max(HERO_NAME_MAX, `Use ${String(HERO_NAME_MAX)} characters or fewer.`),
  gender: z.enum(GENDERS, { error: 'Choose a gender.' }),
  // https and a dotted domain name, never an IP address or a bare localhost: every visit loads this
  // URL from the visitor's browser.
  image: z
    .string()
    .trim()
    .min(1, 'Enter an image URL.')
    .max(
      IMAGE_URL_MAX,
      `Use a URL of ${IMAGE_URL_MAX.toLocaleString('en-US')} characters or fewer.`,
    )
    .pipe(
      z.url({
        protocol: /^https$/,
        hostname: z.regexes.domain,
        error: 'Enter a secure image URL: https:// and a domain name, not an IP address.',
      }),
    ),
})

// crypto.randomUUID gives lowercase v4 ids, the only hero ids a favorites key accepts.
export const heroSchema = heroInputSchema.extend({
  id: z.uuidv4().lowercase(),
  createdAt: z.iso.datetime(),
})

export type HeroInput = z.output<typeof heroInputSchema>
export type Hero = z.output<typeof heroSchema>
