import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { paths } from '../src/shared/config/paths.ts'
import { SITE } from '../src/shared/config/site.ts'

const CHARACTER_PAGE = /^([1-9]\d*)\.html$/
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot'] as const
const SUMMARY =
  'Unofficial fan site to browse, filter and favorite characters from Rick and Morty, built on the public Rick and Morty API.'
const API_SITE = 'https://rickandmortyapi.com'
const EXAMPLE_CHARACTER_ID = 1
const LIST_QUERY = '`page`, `name`, `status`, `species`, `type`, `gender`'

export class SeoFilesError extends Error {
  override readonly name = 'SeoFilesError'
}

export function buildSitemap(siteUrl: string, ids: readonly number[], date: string): string {
  const urls = [paths.home, ...ids.map((id) => paths.character(id))].map(
    (path) => `  <url><loc>${siteUrl}${path}</loc><lastmod>${date}</lastmod></url>`,
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

// Nothing is disallowed: noindex pages must stay crawlable for their robots meta to be read.
export function buildRobots(siteUrl: string): string {
  const groups = ['*', ...AI_CRAWLERS].flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', ''])
  return [...groups, `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n')
}

export function buildLlmsTxt(siteUrl: string): string {
  return [
    `# ${SITE.name}`,
    '',
    `> ${SUMMARY}`,
    '',
    '## Pages',
    '',
    `- [Character list](${siteUrl}${paths.home}): every character, page by page. Query parameters: ${LIST_QUERY}.`,
    `- [Character pages](${siteUrl}${paths.character(EXAMPLE_CHARACTER_ID)}): one page per character at \`/characters/{id}\` with status, species, type, gender, origin, last known location and episodes.`,
    `- [Sitemap](${siteUrl}/sitemap.xml): the character list and every character page.`,
    '',
    '## Data',
    '',
    `- Characters, episodes and images come from [The Rick and Morty API](${API_SITE}).`,
    "- Favorites and created heroes are saved only in the visitor's browser; no page lists them.",
    '',
  ].join('\n')
}

async function prerenderedCharacterIds(outDir: string): Promise<number[]> {
  const files = await readdir(join(outDir, 'characters'))
  return files
    .map((file) => CHARACTER_PAGE.exec(file)?.[1])
    .filter((id) => id !== undefined)
    .map(Number)
    .sort((a, b) => a - b)
}

export async function writeSeoFiles(outDir: string, siteUrl: string): Promise<void> {
  const ids = await prerenderedCharacterIds(outDir)
  if (ids.length === 0) {
    throw new SeoFilesError(
      `no character pages in ${outDir}/characters; the sitemap would list none`,
    )
  }
  const date = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length)
  await Promise.all([
    writeFile(join(outDir, 'sitemap.xml'), buildSitemap(siteUrl, ids, date)),
    writeFile(join(outDir, 'robots.txt'), buildRobots(siteUrl)),
    writeFile(join(outDir, 'llms.txt'), buildLlmsTxt(siteUrl)),
  ])
}
