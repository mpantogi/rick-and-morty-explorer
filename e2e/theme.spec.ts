import { expect, openPage, test, useStoredTheme } from './fixtures'

const DARK_CANVAS = 'rgb(32, 35, 41)'

test.describe('theme', { tag: '@journey' }, () => {
  test('starts light and switches the whole canvas to the dark grey', async ({ page }) => {
    await openPage(page, '/')
    const html = page.locator('html')
    const toggle = page.getByRole('button', { name: 'Dark theme' })

    await expect(html).not.toHaveClass(/\bdark\b/)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await toggle.click()

    await expect(html).toHaveClass(/\bdark\b/)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor))
      .toBe(DARK_CANVAS)
  })

  test('shows the hand cursor on the toggle like any enabled button', async ({ page }) => {
    await openPage(page, '/')

    await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveCSS('cursor', 'pointer')
  })

  test('keeps the dark theme after a reload', async ({ page }) => {
    await openPage(page, '/')
    await page.getByRole('button', { name: 'Dark theme' }).click()

    await page.reload()
    await expect(page.locator('#app[data-v-app]')).toBeAttached()

    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('applies a saved dark theme before the app runs, so it never flashes light', async ({
    page,
  }) => {
    await useStoredTheme(page, 'dark')
    await page.addInitScript(() => {
      const record = (key: string, value: unknown) => {
        document.documentElement.dataset[key] = String(value)
      }
      new MutationObserver((_records, observer) => {
        if (!document.querySelector('body')) return
        record('darkAtBody', document.documentElement.classList.contains('dark'))
        observer.disconnect()
      }).observe(document, { childList: true, subtree: true })
      document.addEventListener('DOMContentLoaded', () => {
        record('canvasAtReady', getComputedStyle(document.documentElement).backgroundColor)
      })
    })

    await page.goto('/')

    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-dark-at-body', 'true')
    await expect(html).toHaveAttribute('data-canvas-at-ready', DARK_CANVAS)
  })
})
