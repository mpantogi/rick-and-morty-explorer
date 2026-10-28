import { render } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { createHead } from '@unhead/vue/client'
import type { Component } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'

import { routes as appRoutes } from '@/app/router/routes'

interface RenderWithAppOptions {
  route?: string
  props?: Record<string, unknown>
  routes?: RouteRecordRaw[]
}

export async function renderWithApp(
  component: Component,
  { route = '/', props, routes = appRoutes }: RenderWithAppOptions = {},
) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(route)
  await router.isReady()
  const user = userEvent.setup()
  const result = render(component, { props, global: { plugins: [router, createHead()] } })
  return { router, user, ...result }
}
