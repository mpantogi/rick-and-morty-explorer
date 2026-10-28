import { createHead } from '@unhead/vue/client'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import { routes } from '../router/routes'
import { installRouteFocus } from './route-focus'

async function mountApp() {
  const router = createRouter({ history: createMemoryHistory(), routes })
  installRouteFocus(router)
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(() => h(RouterView))
    .use(router)
    .use(createHead())
  await router.push('/')
  await router.isReady()
  app.mount(host)
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
    const { unmount } = await mountApp()
    cleanup = unmount
    await nextTick()

    expect(document.activeElement).toBe(document.body)
  })

  it('moves focus to the new page title after a client-side navigation', async () => {
    const { router, unmount } = await mountApp()
    cleanup = unmount

    await router.push('/nope')
    await nextTick()

    expect(document.activeElement).toBe(document.getElementById('page-title'))
    expect(document.activeElement).toHaveTextContent('Page not found')
  })

  it('keeps focus when only the query changes on the same path', async () => {
    const { router, unmount } = await mountApp()
    cleanup = unmount

    await router.push('/?page=2')
    await nextTick()

    expect(document.activeElement).toBe(document.body)
  })
})
