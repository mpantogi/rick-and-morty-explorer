// Fails when the JS or CSS the home page loads up front grows past its gzip budget.
// Counts the module script, its modulepreloads and the stylesheets that dist/index.html references.
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = resolve(import.meta.dirname, '..', 'dist')
const KIB = 1024
const BUDGET_KIB = { js: 150, css: 30 } as const
const TAG = /<(?:script|link)\b[^>]*>/g
const URL_COLUMN = 48
const SIZE_COLUMN = 10

type AssetKind = keyof typeof BUDGET_KIB

interface Asset {
  url: string
  kind: AssetKind
  gzipBytes: number
}

class BudgetError extends Error {
  override readonly name = 'BudgetError'
}

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function loadedUpFront(tag: string): string | undefined {
  if (tag.startsWith('<script')) {
    return attribute(tag, 'type') === 'module' ? attribute(tag, 'src') : undefined
  }
  const rel = attribute(tag, 'rel')
  return rel === 'modulepreload' || rel === 'stylesheet' ? attribute(tag, 'href') : undefined
}

function initialAssetUrls(html: string): string[] {
  const urls = [...html.matchAll(TAG)].map(([tag]) => loadedUpFront(tag))
  return [...new Set(urls.filter((url) => url !== undefined))]
}

async function measure(url: string): Promise<Asset> {
  const kind = extname(url) === '.css' ? 'css' : 'js'
  const content = await readFile(join(DIST, url))
  return { url, kind, gzipBytes: gzipSync(content).length }
}

function kib(bytes: number): string {
  return `${(bytes / KIB).toFixed(1)} KiB`
}

function report(assets: readonly Asset[]): boolean {
  const lines = assets.map(
    (asset) => `${asset.url.padEnd(URL_COLUMN)} ${kib(asset.gzipBytes).padStart(SIZE_COLUMN)}`,
  )
  let withinBudget = true
  for (const kind of ['js', 'css'] as const) {
    const total = assets
      .filter((asset) => asset.kind === kind)
      .reduce((sum, a) => sum + a.gzipBytes, 0)
    const budget = BUDGET_KIB[kind] * KIB
    const fits = total <= budget
    withinBudget &&= fits
    lines.push(
      `${kind.toUpperCase()} total ${kib(total)} of ${kib(budget)}: ${fits ? 'ok' : 'OVER BUDGET'}`,
    )
  }
  process.stdout.write(`${['Initial assets for / (gzip)', ...lines].join('\n')}\n`)
  return withinBudget
}

const html = await readFile(join(DIST, 'index.html'), 'utf8')
const assets = await Promise.all(initialAssetUrls(html).map(measure))
// A build that stopped referencing its scripts would pass any budget, so treat it as broken.
if (!assets.some((asset) => asset.kind === 'js' && asset.gzipBytes > 0)) {
  throw new BudgetError('dist/index.html loads no JavaScript; is dist/ a complete build?')
}
if (!report(assets)) process.exitCode = 1
