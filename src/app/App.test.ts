import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import { renderWithApp } from '../../test/render'
import App from './App.vue'

describe('App', () => {
  it('renders the page for the current route', async () => {
    await renderWithApp(App, { route: '/' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Rick and Morty characters' }),
    ).toBeInTheDocument()
  })
})
