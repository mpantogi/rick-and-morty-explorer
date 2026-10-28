import { paths } from '@/shared/config'

interface HomeSeo {
  title: string
  path: string
  robots: 'index' | 'noindex'
}

const HOME_TITLE = 'Rick and Morty Explorer: Browse Every Character'
const FIRST_PAGE = 1

// Plain pages of the list are indexable on their own URL; filtered views fold into the home page.
export function homeSeo({ page, isFiltered }: { page: number; isFiltered: boolean }): HomeSeo {
  if (isFiltered) return { title: `Characters – page ${page}`, path: paths.home, robots: 'noindex' }
  if (page === FIRST_PAGE) return { title: HOME_TITLE, path: paths.home, robots: 'index' }
  return { title: `Characters – page ${page}`, path: `${paths.home}?page=${page}`, robots: 'index' }
}
