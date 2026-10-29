import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { render } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { type Component, defineComponent } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'

import { routes as appRoutes } from '@/app/router/routes'

import { trackQueryClient } from './settle-queries'

interface RenderWithAppOptions {
  route?: string
  props?: Record<string, unknown>
  slots?: Record<string, string>
  routes?: RouteRecordRaw[]
  // Pass one to seed the cache before the component mounts.
  queryClient?: QueryClient
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
}

export async function renderWithApp(
  component: Component,
  {
    route = '/',
    props,
    slots,
    routes = appRoutes,
    queryClient = createTestQueryClient(),
  }: RenderWithAppOptions = {},
) {
  trackQueryClient(queryClient)
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(route)
  await router.isReady()
  const user = userEvent.setup()
  const result = render(component, {
    props,
    slots,
    global: {
      plugins: [router, createPinia(), [VueQueryPlugin, { queryClient }], createHead()],
    },
  })
  return { router, queryClient, user, ...result }
}

// Runs a composable inside a mounted component, so inject(), lifecycle hooks and watchers work.
export async function renderComposable<T>(
  composable: () => T,
  options: Omit<RenderWithAppOptions, 'props' | 'slots'> = {},
) {
  const box: { captured?: { value: T } } = {}
  const Host = defineComponent({
    setup() {
      box.captured = { value: composable() }
      return () => null
    },
  })
  const rendered = await renderWithApp(Host, options)
  const { captured } = box
  if (!captured) throw new Error('The composable did not run during setup')
  return { result: captured.value, ...rendered }
}
