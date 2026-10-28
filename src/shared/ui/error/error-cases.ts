import type { ErrorCase } from '@/shared/api'

export interface ErrorCaseCopy {
  accent: string
  headline: string
  body: string
  recovery: 'back' | 'retry'
  support: boolean
}

export const ERROR_CASES = {
  not_found: {
    accent: 'Wrong dimension.',
    headline: "We couldn't find this page.",
    body: "The link may be broken, or what you're looking for doesn't exist here.",
    recovery: 'back',
    support: false,
  },
  server: {
    accent: 'The portal is jammed.',
    headline: "The character service isn't responding.",
    body: 'The public Rick and Morty API returned an error. This is usually temporary.',
    recovery: 'retry',
    support: true,
  },
  unknown: {
    accent: 'Something broke.',
    headline: "This page couldn't load.",
    body: 'An unexpected error stopped this page from loading.',
    recovery: 'retry',
    support: true,
  },
} as const satisfies Record<ErrorCase, ErrorCaseCopy>
