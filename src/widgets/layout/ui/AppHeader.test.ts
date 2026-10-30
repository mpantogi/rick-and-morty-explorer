import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'

import { renderWithApp } from '../../../../test/render'
import AppHeader from './AppHeader.vue'

const menuButton = () => screen.getByRole('button', { name: 'Menu' })

describe('AppHeader', () => {
  it('opens and closes the main navigation from its menu button', async () => {
    const { user } = await renderWithApp(AppHeader)
    const nav = screen.getByRole('navigation', { name: 'Main' })

    expect(menuButton()).toHaveAttribute('aria-controls', nav.id)
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')

    await user.click(menuButton())
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true')

    await user.click(menuButton())
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the menu after a link, even to the page already open', async () => {
    const { user, router } = await renderWithApp(AppHeader)
    const followFavorites = async () => {
      await user.click(menuButton())
      await user.click(screen.getByRole('link', { name: 'Favorites' }))
      await vi.waitFor(() => {
        expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
      })
    }

    await followFavorites()
    expect(router.currentRoute.value.path).toBe('/favorites')
    await followFavorites()
  })

  it('returns focus to the menu button when a link to the open page closes the menu', async () => {
    const { user } = await renderWithApp(AppHeader, { route: '/favorites' })
    await user.click(menuButton())

    await user.click(screen.getByRole('link', { name: 'Favorites' }))

    await vi.waitFor(() => {
      expect(menuButton()).toHaveFocus()
    })
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('takes the visitor to the top from the logo and from a main link', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    const { user } = await renderWithApp(AppHeader, { route: '/?page=2' })

    await user.click(screen.getByRole('link', { name: 'Rick and Morty Explorer, home' }))
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
    scrollTo.mockClear()

    await user.click(screen.getByRole('link', { name: 'Characters' }))
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
  })

  it('leaves the page where it is when a link opens in a new tab', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    const { user } = await renderWithApp(AppHeader, { route: '/?page=2' })

    await user.keyboard('{Control>}')
    await user.click(screen.getByRole('link', { name: 'Rick and Morty Explorer, home' }))
    await user.keyboard('{/Control}')

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('closes the menu on a click outside the header', async () => {
    const { user } = await renderWithApp(AppHeader)
    await user.click(menuButton())

    await user.click(document.body)

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
  })
})
