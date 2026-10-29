import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import { routes } from '../router/routes'
import { installRouteFocus } from './route-focus'

async function mountApp(initialPath = '/') {
  const history = createMemoryHistory()
  history.replace(initialPath)
  const router = createRouter({ history, routes })
  installRouteFocus(router)
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(() => h(RouterView))
    .use(router)
    .use(createPinia())
    .use(createHead())
    .use(VueQueryPlugin, {
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    })
  app.mount(host)
  await router.isReady()
  return {
    router,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
}

describe('installRouteFocus', () => {
  let cleanup: () => void = () => undefined

  afterEach(() => {
    cleanup()
  })

  it('leaves focus alone on the initial navigation', async () => {
    const { unmount } = await mountApp('/nope')
    cleanup = unmount
    await nextTick()

    expect(document.getElementById('page-title')).toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })

  it('moves focus to the new page title after a client-side navigation', async () => {
    const { router, unmount } = await mountApp()
    cleanup = unmount

    await router.push('/nope')
    await nextTick()

    expect(document.activeElement).toBe(document.getElementById('page-title'))
    expect(document.activeElement).toHaveTextContent("We couldn't find this page.")
  })

  // Same-path changes (paging, filters) keep focus; paging moves it to the results heading.
  it('keeps focus when only the query changes on the same path', async () => {
    const { router, unmount } = await mountApp()
    cleanup = unmount

    await router.push('/?name=rick')
    await nextTick()

    expect(document.activeElement).toBe(document.body)
  })
})
