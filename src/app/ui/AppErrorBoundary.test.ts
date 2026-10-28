import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { type FunctionalComponent, h } from 'vue'
import { RouterView } from 'vue-router'

import { renderWithApp } from '../../../test/render'
import AppErrorBoundary from './AppErrorBoundary.vue'

const failure = new Error('render failed')

const BrokenPage: FunctionalComponent = () => {
  throw failure
}
BrokenPage.displayName = 'BrokenPage'

const FinePage: FunctionalComponent = () => h('h1', { id: 'page-title' }, 'Fine page')
FinePage.displayName = 'FinePage'

const Shell: FunctionalComponent = () => h(AppErrorBoundary, null, { default: () => h(RouterView) })

const routes = [
  { path: '/broken', component: BrokenPage },
  { path: '/fine', component: FinePage },
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
})
