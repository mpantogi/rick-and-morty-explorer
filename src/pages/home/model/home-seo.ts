import { FIRST_PAGE } from '@/features/character-filters'
import { paths } from '@/shared/config'

interface HomeSeo {
  title: string
  path: string
  robots: 'index' | 'noindex'
}

const HOME_TITLE = 'Rick and Morty Explorer: Browse Every Character'

interface HomeListView {
  page: number
  isFiltered: boolean
  isOutOfRange: boolean
}

// The host serves every list URL the prerendered home document, so every view keeps its canonical.
// Filtered views and pages past the last one stay out of the index (search results, no soft 404).
export function homeSeo({ page, isFiltered, isOutOfRange }: HomeListView): HomeSeo {
  const isVariant = isFiltered || isOutOfRange
  return {
    title: page === FIRST_PAGE && !isVariant ? HOME_TITLE : `Characters – page ${String(page)}`,
    path: paths.home,
    robots: isVariant ? 'noindex' : 'index',
  }
}
