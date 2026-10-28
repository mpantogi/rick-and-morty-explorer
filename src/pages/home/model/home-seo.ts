import { paths } from '@/shared/config'

interface HomeSeo {
  title: string
  path: string
  robots: 'index' | 'noindex'
}

const HOME_TITLE = 'Rick and Morty Explorer: Browse Every Character'
const FIRST_PAGE = 1

interface HomeListView {
  page: number
  isFiltered: boolean
  isOutOfRange: boolean
}

// Plain pages of the list are indexable on their own URL; filtered views and pages past the last
// one fold into the home page, so neither is indexed as a page of its own (no soft 404).
export function homeSeo({ page, isFiltered, isOutOfRange }: HomeListView): HomeSeo {
  if (isFiltered || isOutOfRange) {
    return { title: `Characters – page ${page}`, path: paths.home, robots: 'noindex' }
  }
  if (page === FIRST_PAGE) return { title: HOME_TITLE, path: paths.home, robots: 'index' }
  return { title: `Characters – page ${page}`, path: `${paths.home}?page=${page}`, robots: 'index' }
}
