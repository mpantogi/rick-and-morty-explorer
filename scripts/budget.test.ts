import { describe, expect, it } from 'vitest'

import {
  type Asset,
  assetKind,
  budgetTotals,
  BudgetError,
  formatReport,
  initialAssetUrls,
} from './budget'

const KIB = 1024

function asset(url: string, kib: number): Asset {
  return { url, kind: assetKind(url), gzipBytes: kib * KIB }
}

describe('initialAssetUrls', () => {
  it('lists the module script, its modulepreloads and the stylesheets, each once', () => {
    const html = [
      '<script>try{}catch{}</script>',
      '<script type="module" crossorigin src="/assets/app.js"></script>',
      '<link rel="modulepreload" crossorigin href="/assets/ui.js">',
      '<link rel="modulepreload" crossorigin href="/assets/ui.js">',
      '<link rel="stylesheet" crossorigin href="/assets/app.css">',
      '<link rel="preconnect" href="https://rickandmortyapi.com">',
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      '<script type="application/ld+json">{}</script>',
    ].join('')

    expect(initialAssetUrls(html)).toEqual(['/assets/app.js', '/assets/ui.js', '/assets/app.css'])
  })
})

describe('budgetTotals', () => {
  it('adds up each kind and compares it with its budget', () => {
    const totals = budgetTotals([asset('/a.js', 100), asset('/b.js', 50), asset('/a.css', 31)])

    expect(totals).toEqual([
      { kind: 'js', bytes: 150 * KIB, budgetBytes: 150 * KIB, fits: true },
      { kind: 'css', bytes: 31 * KIB, budgetBytes: 30 * KIB, fits: false },
    ])
  })

  it.each([
    ['no JavaScript', [asset('/a.css', 8)]],
    ['empty JavaScript', [asset('/a.js', 0), asset('/a.css', 8)]],
    ['no stylesheet', [asset('/a.js', 100)]],
  ])('treats a page that loads %s as a broken build', (_, assets) => {
    expect(() => budgetTotals(assets)).toThrow(BudgetError)
  })
})

describe('formatReport', () => {
  it('prints each asset, then each total with its verdict', () => {
    const assets = [asset('/assets/app.js', 151), asset('/assets/app.css', 8)]

    const report = formatReport(assets, budgetTotals(assets))

    expect(report.split('\n')).toEqual([
      'Initial assets for / (gzip)',
      `${'/assets/app.js'.padEnd(48)} ${'151.0 KiB'.padStart(10)}`,
      `${'/assets/app.css'.padEnd(48)} ${'8.0 KiB'.padStart(10)}`,
      'JS total 151.0 KiB of 150.0 KiB: OVER BUDGET',
      'CSS total 8.0 KiB of 30.0 KiB: ok',
      '',
    ])
  })
})
