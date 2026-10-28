import { screen, within } from '@testing-library/vue'
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
  })

  it('makes the skip link the first stop and points it at the main landmark', async () => {
    const { user } = await renderWithApp(App, { route: '/' })

    await user.tab()

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('marks the current section in the main navigation', async () => {
    await renderWithApp(App, { route: '/' })

    const nav = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(nav.getAllByRole('link').map((link) => link.textContent.trim())).toEqual([
      'Characters',
      'Favorites',
      'Create hero',
    ])
    expect(nav.getByRole('link', { name: 'Characters' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Favorites' })).not.toHaveAttribute('aria-current')
  })

  it('names the logo link, offers the theme toggle and credits the API in the footer', async () => {
    await renderWithApp(App, { route: '/' })

    const banner = within(screen.getByRole('banner'))
    const logo = banner.getByRole('link', { name: 'Rick and Morty Explorer, home' })
    expect(logo).toHaveAttribute('href', '/')
    expect(logo).not.toHaveAttribute('aria-current', 'page')
    expect(banner.getByRole('button', { name: 'Dark theme' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('contentinfo')).getByRole('link', { name: 'The Rick and Morty API' }),
    ).toHaveAttribute('href', 'https://rickandmortyapi.com')
  })
})
