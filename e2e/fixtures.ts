import { AxeBuilder } from '@axe-core/playwright'
import { test as base, type ConsoleMessage, expect, type Page } from '@playwright/test'

import type { Hero } from '../src/entities/character/model/hero-schema.ts'
import { STORAGE_KEYS } from '../src/shared/config/storage-keys.ts'
import { mockApi } from './support/api-mock.ts'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

declare global {
  interface Window {
    reportCspViolation: (violation: string) => Promise<void>
  }
}

export type Theme = 'light' | 'dark'

export interface ConsoleGuard {
  // Tolerates the browser's "Failed to load resource" error for responses whose URL matches.
  allowHttpErrors(...patterns: RegExp[]): void
}

interface Fixtures {
  apiMock: undefined
  consoleGuard: ConsoleGuard
  makeAxeBuilder: () => AxeBuilder
}

function isAllowedHttpError(message: ConsoleMessage, allowed: readonly RegExp[]): boolean {
  if (!message.text().startsWith('Failed to load resource')) return false
  const { url } = message.location()
  return allowed.some((pattern) => pattern.test(url))
}

export const test = base.extend<Fixtures>({
  // Every API call is answered from the recorded fixture, so no test depends on the live API.
  apiMock: [
    async ({ page }, use) => {
      await mockApi(page)
      await use(undefined)
    },
    { auto: true },
  ],
  consoleGuard: [
    async ({ page }, use) => {
      const problems: string[] = []
      const allowed: RegExp[] = []
      await page.exposeFunction('reportCspViolation', (violation: string) => {
        problems.push(`CSP violation: ${violation}`)
      })
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          void window.reportCspViolation(`${event.violatedDirective} blocked ${event.blockedURI}`)
        })
      })
      page.on('console', (message) => {
        if (message.type() === 'error' && !isAllowedHttpError(message, allowed)) {
          problems.push(message.text())
        }
      })
      page.on('pageerror', (error) => {
        problems.push(`Uncaught: ${error.message}`)
      })

      await use({
        allowHttpErrors: (...patterns) => {
          allowed.push(...patterns)
        },
      })

      expect(problems, 'console errors, uncaught errors or CSP violations').toEqual([])
    },
    { auto: true },
  ],
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags(WCAG_TAGS))
  },
})

export { expect }

// The client mounts over the prerendered HTML (no hydration), so wait for Vue's mount marker.
export async function openPage(page: Page, path: string) {
  const response = await page.goto(path)
  await expect(page.locator('#app[data-v-app]')).toBeAttached()
  return response
}

export async function useStoredTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value)
    },
    [STORAGE_KEYS.theme, theme] as const,
  )
}

// Seeds this browser's favorites (newest first) before any page script runs.
export async function useStoredFavorites(page: Page, keys: readonly string[]): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value)
    },
    [STORAGE_KEYS.favorites, JSON.stringify(keys)] as const,
  )
}

// Seeds the heroes this browser created (newest first) before any page script runs.
export async function useStoredHeroes(page: Page, heroes: readonly Hero[]): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value)
    },
    [STORAGE_KEYS.heroes, JSON.stringify(heroes)] as const,
  )
}
