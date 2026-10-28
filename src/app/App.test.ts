import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import { renderWithApp } from '../../test/render'
import App from './App.vue'

describe('App', () => {
  it('renders the page for the current route inside the main landmark', async () => {
    await renderWithApp(App, { route: '/' })

    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Rick and Morty characters' }),
    )
  })

  it('renders the not-found page for an unknown path', async () => {
    await renderWithApp(App, { route: '/nope' })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: "Wrong dimension. We couldn't find this page.",
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse characters' })).toHaveAttribute('href', '/')
  })
})
