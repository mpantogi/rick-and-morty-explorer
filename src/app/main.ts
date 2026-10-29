import { dehydrate, type DehydratedState, hydrate, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'
import 'vue-sonner/style.css'

import App from './App.vue'
import { installChunkReload } from './lib/chunk-reload'
import { installRouteFocus } from './lib/route-focus'
import { scheduleRoutePrefetch } from './lib/route-prefetch'
import { createQueryClient } from './providers/query-client'
import { routes } from './router/routes'
import { scrollBehavior } from './router/scroll-behavior'
import './styles/main.css'

export const createApp = ViteSSG(
  App,
  // Empty link state classes keep the BEM class first; links style the current page via aria-current.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- scrollBehavior is stable; its replacement is experimental in vue-router 5.4
  { routes, scrollBehavior, linkActiveClass: '', linkExactActiveClass: '' },
  async ({ app, router, initialState, onSSRAppRendered, routePath }) => {
    app.use(createPinia())
    const queryClient = createQueryClient()
    app.use(VueQueryPlugin, { queryClient })
    // SSR-only imports keep the catalogue and its build-time requests out of the client bundle.
    if (import.meta.env.SSR) {
      const { seedRoute } = await import('./ssg/seed-route')
      await seedRoute(queryClient, router.resolve(routePath ?? '/'))
      onSSRAppRendered(() => {
        const state = dehydrate(queryClient)
        if (state.queries.length > 0) initialState.vueQuery = state
      })
      return
    }
    if (initialState.vueQuery) hydrate(queryClient, initialState.vueQuery as DehydratedState)
    installChunkReload(router)
    installRouteFocus(router)
    scheduleRoutePrefetch(router)
  },
  { registerComponents: false },
)

export async function includedRoutes(paths: string[]): Promise<string[]> {
  if (!import.meta.env.SSR) return paths
  const { prerenderRoutes } = await import('./ssg/prerender-routes')
  return prerenderRoutes()
}
