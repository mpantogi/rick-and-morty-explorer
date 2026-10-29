import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { toast } from 'vue-sonner'

import { STORAGE_KEYS } from '@/shared/config'

import indexHtml from '../../../../index.html?raw'
import { useTheme } from './use-theme'

const LIGHT_CANVAS = '#f9fafb'
const DARK_CANVAS = '#202329'

function mockSystemPreference(prefersDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: prefersDark && query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

function startTheme() {
  const scope = effectScope()
  const theme = scope.run(useTheme)
  if (!theme) throw new Error('useTheme did not run')
  return {
    theme,
    stop: () => {
      scope.stop()
    },
  }
}

describe('useTheme', () => {
  let stop: () => void = () => undefined

  beforeEach(() => {
    document.documentElement.className = ''
    mockSystemPreference(false)
  })

  afterEach(() => {
    stop()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('defaults to the light theme', async () => {
    const started = startTheme()
    stop = started.stop
    await nextTick()

    expect(started.theme.isDark.value).toBe(false)
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('starts light on a dark OS with nothing saved, as the no-flash script does', async () => {
    mockSystemPreference(true)
    const started = startTheme()
    stop = started.stop
    await nextTick()

    expect(started.theme.isDark.value).toBe(false)
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('persists the choice and applies the dark class to the document', async () => {
    const started = startTheme()
    stop = started.stop

    started.theme.toggle()
    await nextTick()

    expect(started.theme.isDark.value).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('stores the literal mode even when the choice matches a dark OS preference', async () => {
    mockSystemPreference(true)
    const started = startTheme()
    stop = started.stop

    started.theme.toggle()
    await nextTick()
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')

    started.theme.toggle()
    await nextTick()
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('restores a saved dark choice', async () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'dark')
    const started = startTheme()
    stop = started.stop
    await nextTick()

    expect(started.theme.isDark.value).toBe(true)
  })

  it('reports blocked storage once and still switches the theme for this visit', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 'id')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const blocked = new DOMException('The operation is insecure.', 'SecurityError')
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw blocked
    })
    const started = startTheme()
    stop = started.stop

    started.theme.toggle()
    await nextTick()

    expect(started.theme.isDark.value).toBe(true)
    expect(document.documentElement).toHaveClass('dark')
    expect(consoleError).toHaveBeenCalledExactlyOnceWith('[storage]', blocked)
    expect(toastError).toHaveBeenCalledOnce()
  })

  it('shares one theme state between callers', () => {
    const scope = effectScope()
    const [first, second] = scope.run(() => [useTheme(), useTheme()]) ?? []
    stop = () => {
      scope.stop()
    }

    expect(first).toBeDefined()
    expect(first).toBe(second)
  })

  it('is read by the no-flash script in index.html under the same storage key', () => {
    expect(indexHtml).toContain(`localStorage.getItem('${STORAGE_KEYS.theme}') === 'dark'`)
  })

  it('paints the browser bar in the chosen theme, not the operating system one', async () => {
    mockSystemPreference(true)
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = LIGHT_CANVAS
    document.head.append(meta)
    const started = startTheme()
    stop = () => {
      started.stop()
      meta.remove()
    }

    started.theme.toggle()
    await nextTick()
    expect(meta.content).toBe(DARK_CANVAS)

    started.theme.toggle()
    await nextTick()
    expect(meta.content).toBe(LIGHT_CANVAS)
  })

  it('starts the browser bar light and lets the no-flash script switch it with the page', () => {
    const metas = [...indexHtml.matchAll(/<meta name="theme-color"[^>]*>/g)].map(([tag]) => tag)

    expect(metas).toEqual([`<meta name="theme-color" content="${LIGHT_CANVAS}" />`])
    expect(indexHtml).toContain(`.setAttribute('content', '${DARK_CANVAS}')`)
  })
})
