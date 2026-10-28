import { z } from 'zod'

import { GENDERS } from './types'

const NAME_MIN = 2
const HERO_NAME_MAX = 60
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
  // https on a public domain only: every visit loads this URL from the visitor's browser.
  image: z
    .string()
    .trim()
    .min(1, 'Enter an image URL.')
    .max(IMAGE_URL_MAX, 'Use a URL of 2,048 characters or fewer.')
    .pipe(
      z.url({
        protocol: /^https$/,
        hostname: z.regexes.domain,
        error: 'Enter a secure image URL starting with https://.',
      }),
    ),
})

export const heroSchema = heroInputSchema.extend({ id: z.uuid(), createdAt: z.iso.datetime() })

export type HeroInput = z.output<typeof heroInputSchema>
export type Hero = z.output<typeof heroSchema>
