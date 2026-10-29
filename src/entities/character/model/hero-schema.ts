import { z } from '@/shared/zod'

import { GENDERS } from './types'

const NAME_MIN = 2
export const HERO_NAME_MAX = 60
const IMAGE_URL_MAX = 2048

// One schema for the form and for every read from storage. Keys follow the form's field order.
export const heroInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name.')
    .min(NAME_MIN, 'Use at least 2 characters.')
    .max(HERO_NAME_MAX, 'Use 60 characters or fewer.'),
  gender: z.enum(GENDERS, { error: 'Choose a gender.' }),
  // https and a dotted domain name, never an IP address or a bare localhost: every visit loads this
  // URL from the visitor's browser.
  image: z
    .string()
    .trim()
    .min(1, 'Enter an image URL.')
    .max(IMAGE_URL_MAX, 'Use a URL of 2,048 characters or fewer.')
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
