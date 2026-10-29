import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, type FunctionalComponent, h } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { renderWithApp } from '../../../test/render'
import AppErrorBoundary from './AppErrorBoundary.vue'

const failure = new Error('render failed')

const BrokenPage: FunctionalComponent = () => {
  throw failure
}
BrokenPage.displayName = 'BrokenPage'

const FinePage: FunctionalComponent = () => h('h1', { id: 'page-title' }, 'Fine page')
FinePage.displayName = 'FinePage'

// Crashes only for one query, as a bad filter value could on the home list.
const ListPage = defineComponent({
  setup() {
    const route = useRoute()
    return () => {
      if (route.query.crash) throw failure
      return h('h1', { id: 'page-title' }, 'List page')
    }
  },
})

// Crashes on its first render only, as a transient failure would.
let flakyRenders = 0
const FlakyPage: FunctionalComponent = () => {
  flakyRenders += 1
  if (flakyRenders === 1) throw failure
  return h('h1', { id: 'page-title' }, 'Flaky page')
}
FlakyPage.displayName = 'FlakyPage'

const Shell: FunctionalComponent = () => h(AppErrorBoundary, null, { default: () => h(RouterView) })

const routes = [
  { path: '/broken', component: BrokenPage },
  { path: '/fine', component: FinePage },
  { path: '/list', component: ListPage },
  { path: '/flaky', component: FlakyPage },
]

describe('AppErrorBoundary', () => {
  it('replaces a crashed page with the unknown error view and reports the crash', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await renderWithApp(Shell, { route: '/broken', routes })

    expect(
      screen.getByRole('heading', { level: 1, name: "Something broke. This page couldn't load." }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('[render]', failure)
  })

  it('recovers when the visitor navigates to another page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { router } = await renderWithApp(Shell, { route: '/broken', routes })

    await router.push('/fine')

    expect(await screen.findByRole('heading', { level: 1, name: 'Fine page' })).toBeInTheDocument()
  })

  it('recovers when the visitor returns to the same path without the failing query', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { router } = await renderWithApp(Shell, { route: '/list?crash=1', routes })

    await router.push('/list')

    expect(await screen.findByRole('heading', { level: 1, name: 'List page' })).toBeInTheDocument()
  })

  it('retries on a push to the very page that crashed, as Browse characters does from home', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    flakyRenders = 0
    const { router } = await renderWithApp(Shell, { route: '/flaky', routes })

    await router.push('/flaky')

    expect(await screen.findByRole('heading', { level: 1, name: 'Flaky page' })).toBeInTheDocument()
  })
})
