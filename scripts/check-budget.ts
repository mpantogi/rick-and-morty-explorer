// Fails when the JS or CSS the home page loads up front grows past its gzip budget.
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import { type Asset, assetKind, budgetTotals, formatReport, initialAssetUrls } from './budget.ts'

const DIST = resolve(import.meta.dirname, '..', 'dist')

async function measure(url: string): Promise<Asset> {
  const content = await readFile(join(DIST, url))
  return { url, kind: assetKind(url), gzipBytes: gzipSync(content).length }
}

const html = await readFile(join(DIST, 'index.html'), 'utf8')
const assets = await Promise.all(initialAssetUrls(html).map(measure))
const totals = budgetTotals(assets)
process.stdout.write(formatReport(assets, totals))
if (totals.some((total) => !total.fits)) process.exitCode = 1
