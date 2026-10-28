import type { Page } from '@playwright/test'

interface StateEntry {
  region: string
  state: string
}

declare global {
  interface Window {
    __stateLog: StateEntry[]
    __overlap: boolean
  }
}

// Every data-backed region; each renders exactly one `[data-state]` branch at a time.
const REGIONS = ['#results', '#profile', '#episodes', '#favorites']

// Records each region's state transitions from the first byte of HTML and flags the moment two
// branches are on screen together, including the prerendered markup the client replaces.
export async function installStateProbe(page: Page): Promise<void> {
  await page.addInitScript((regions: string[]) => {
    window.__stateLog = []
    window.__overlap = false
    const last = new Map<string, string>()
    const check = () => {
      for (const selector of regions) {
        const branches = document.querySelectorAll(`${selector} [data-state]`)
        if (branches.length > 1) window.__overlap = true
        const state = [...branches].map((branch) => branch.getAttribute('data-state')).join('+')
        if (state && last.get(selector) !== state) {
          last.set(selector, state)
          window.__stateLog.push({ region: selector, state })
        }
      }
    }
    new MutationObserver(check).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state'],
    })
  }, REGIONS)
}

export function readStateProbe(page: Page): Promise<{ log: StateEntry[]; overlap: boolean }> {
  return page.evaluate(() => ({ log: window.__stateLog, overlap: window.__overlap }))
}

export function statesOf(log: readonly StateEntry[], region: string): string[] {
  return log.filter((entry) => entry.region === region).map((entry) => entry.state)
}
