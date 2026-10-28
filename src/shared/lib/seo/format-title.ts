import { SITE } from '@/shared/config'

import { truncate } from './truncate'

const TITLE_MAX = 60

export function formatTitle(page: string): string {
  const withSiteName = `${page} | ${SITE.name}`
  return withSiteName.length <= TITLE_MAX ? withSiteName : truncate(page, TITLE_MAX)
}
