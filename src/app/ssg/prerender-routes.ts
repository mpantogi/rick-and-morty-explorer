import { paths } from '@/shared/config'

import { loadCatalogue } from './catalogue'

// /404 is written to 404.html, which the host serves with a real 404 status for unknown paths.
// Created heroes exist only in the browser: public/_redirects serves every /heroes/:id this shell.
const STATIC_ROUTES = [paths.home, paths.favorites, paths.createHero, paths.hero('shell'), '/404']

export async function prerenderRoutes(): Promise<string[]> {
  const { characters } = await loadCatalogue()
  return [...STATIC_ROUTES, ...[...characters.keys()].map((id) => paths.character(id))]
}
