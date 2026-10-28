import './zod-config'

import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'
import 'vue-sonner/style.css'

import App from './App.vue'
import { installChunkReload } from './lib/chunk-reload'
import { installRouteFocus } from './lib/route-focus'
import { createQueryClient } from './providers/query-client'
import { routes } from './router/routes'
import { scrollBehavior } from './router/scroll-behavior'
import './styles/main.css'

const PRERENDERED_PATHS = ['/', '/404']

export const createApp = ViteSSG(
  App,
  // Empty link state classes keep the BEM class first; links style the current page via aria-current.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- stable API; replacement is experimental in vue-router 5.4
  { routes, scrollBehavior, linkActiveClass: '', linkExactActiveClass: '' },
  ({ app, router }) => {
    app.use(createPinia())
    app.use(VueQueryPlugin, { queryClient: createQueryClient() })
    if (import.meta.env.SSR) return
    installChunkReload(router)
    installRouteFocus(router)
  },
  { registerComponents: false },
)

export function includedRoutes(): string[] {
  return PRERENDERED_PATHS
}
