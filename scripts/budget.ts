// What the home page loads up front, and whether it fits the gzip budget; check-budget.ts runs it.
import { extname } from 'node:path'

const KIB = 1024
const BUDGET_KIB = { js: 150, css: 30 } as const
const TAG = /<(?:script|link)\b[^>]*>/g
const URL_COLUMN = 48
const SIZE_COLUMN = 10

type AssetKind = keyof typeof BUDGET_KIB

export interface Asset {
  url: string
  kind: AssetKind
  gzipBytes: number
}

export interface BudgetTotal {
  kind: AssetKind
  bytes: number
  budgetBytes: number
  fits: boolean
}

export class BudgetError extends Error {
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

// The module script, its modulepreloads and the stylesheets, each once.
export function initialAssetUrls(html: string): string[] {
  const urls = [...html.matchAll(TAG)].map(([tag]) => loadedUpFront(tag))
  return [...new Set(urls.filter((url) => url !== undefined))]
}

export function assetKind(url: string): AssetKind {
  return extname(url) === '.css' ? 'css' : 'js'
}

// A build that stopped referencing its scripts or styles would pass any budget, so it is an error.
export function budgetTotals(assets: readonly Asset[]): BudgetTotal[] {
  return (['js', 'css'] as const).map((kind) => {
    const bytes = assets
      .filter((asset) => asset.kind === kind)
      .reduce((sum, asset) => sum + asset.gzipBytes, 0)
    if (bytes === 0) {
      throw new BudgetError(
        `dist/index.html loads no ${kind.toUpperCase()}; is dist/ a complete build?`,
      )
    }
    const budgetBytes = BUDGET_KIB[kind] * KIB
    return { kind, bytes, budgetBytes, fits: bytes <= budgetBytes }
  })
}

function kib(bytes: number): string {
  return `${(bytes / KIB).toFixed(1)} KiB`
}

export function formatReport(assets: readonly Asset[], totals: readonly BudgetTotal[]): string {
  const lines = assets.map(
    (asset) => `${asset.url.padEnd(URL_COLUMN)} ${kib(asset.gzipBytes).padStart(SIZE_COLUMN)}`,
  )
  const summary = totals.map(
    ({ kind, bytes, budgetBytes, fits }) =>
      `${kind.toUpperCase()} total ${kib(bytes)} of ${kib(budgetBytes)}: ${fits ? 'ok' : 'OVER BUDGET'}`,
  )
  return `${['Initial assets for / (gzip)', ...lines, ...summary].join('\n')}\n`
}
