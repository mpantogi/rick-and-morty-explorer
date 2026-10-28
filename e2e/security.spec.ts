import type { Page } from '@playwright/test'

import { expect, openPage, test } from './fixtures'

const API_ROUTES = 'https://rickandmortyapi.com/**'
const XSS_NAME = '<img src=x onerror=alert(1)>'
const IMAGE = 'https://rickandmortyapi.com/api/character/avatar/7.jpeg'

// Every page the console guard checks for CSP violations, with what shows it has finished.
const PAGES = [
  { path: '/', settled: '#results [data-state="ready"]' },
  { path: '/characters/1', settled: '#episodes [data-state="ready"]' },
  { path: '/heroes/new', settled: '#page-title' },
] as const

async function createHero(page: Page, name: string): Promise<void> {
  await openPage(page, '/heroes/new')
  await page.getByRole('textbox', { name: 'Name' }).fill(name)
  await page.getByRole('group', { name: 'Gender' }).getByRole('radio', { name: 'Female' }).check()
  await page.getByRole('textbox', { name: 'Image URL' }).fill(IMAGE)
  await page.getByRole('button', { name: 'Create hero' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('security', () => {
  test('answers with the security headers a meta tag cannot carry', async ({ request }) => {
    const headers = (await request.get('/')).headers()

    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains')
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(headers['permissions-policy']).toContain('camera=()')
  })

  test('caches hashed assets for a year', async ({ request }) => {
    const html = await (await request.get('/')).text()
    const script = /<script type="module"[^>]* src="([^"]+)"/.exec(html)?.[1] ?? ''
    expect(script).toMatch(/^\/assets\//)

    const response = await request.get(script)

    expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable')
  })

  for (const { path, settled } of PAGES) {
    test(`${path} runs under its CSP without a single violation`, async ({ page }) => {
      await openPage(page, path)
      await expect(page.locator(settled)).toBeVisible()

      // The console guard fails the test on any violation, so a clean finish is the assertion.
      await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toBeAttached()
    })
  }

  test('the CSP blocks an inline script injected into a live page', async ({ context }) => {
    // A separate tab: the console guard watches only the test's own page.
    const tab = await context.newPage()
    await tab.route(API_ROUTES, (route) => route.abort())
    await tab.goto('/heroes/new')

    const violated = await tab.evaluate(
      () =>
        new Promise<string>((resolve) => {
          document.addEventListener('securitypolicyviolation', (event) => {
            resolve(event.violatedDirective)
          })
          const script = document.createElement('script')
          script.textContent = 'document.documentElement.dataset.injected = "yes"'
          document.head.append(script)
        }),
    )

    expect(violated).toMatch(/^script-src/)
    await expect(tab.locator('html')).not.toHaveAttribute('data-injected', 'yes')
  })

  test('renders markup in a hero name as plain text', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message())
      void dialog.dismiss()
    })

    await createHero(page, XSS_NAME)

    const firstCard = page.locator('#results').getByRole('article').first()
    await expect(firstCard.getByRole('heading')).toHaveText(XSS_NAME)
    await expect(page.locator('img[src="x"]')).toHaveCount(0)
    expect(dialogs).toEqual([])
  })
})
