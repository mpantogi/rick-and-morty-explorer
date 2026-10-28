import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import { STORAGE_KEYS } from '@/shared/config'

import { renderWithApp } from '../../../../test/render'
import FavoriteToggle from './FavoriteToggle.vue'

const MAX_FAVORITES = 2000

async function renderToggle(props: Record<string, unknown> = {}) {
  return renderWithApp(FavoriteToggle, {
    props: { characterKey: 'api:1', name: 'Rick Sanchez', ...props },
  })
}

describe('FavoriteToggle', () => {
  it('is a named toggle button that saves and unsaves the character', async () => {
    const rendered = await renderToggle()
    const button = screen.getByRole('button', { name: 'Favorite Rick Sanchez' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await rendered.user.click(button)

    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) ?? '[]')).toEqual(['api:1'])
    expect(rendered.emitted('change')).toEqual([[true]])

    await rendered.user.click(button)

    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(rendered.emitted('change')).toEqual([[true], [false]])
  })

  it('shows a visible label in the labelled variant, unchanged by its state', async () => {
    const { user } = await renderToggle({ variant: 'labelled' })
    const button = screen.getByRole('button', { name: 'Favorite' })

    await user.click(button)

    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveTextContent('Favorite')
  })

  it('reflects a favorite saved earlier', async () => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['api:1']))

    await renderToggle()

    expect(screen.getByRole('button', { name: 'Favorite Rick Sanchez' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('explains the limit with a toast and stays off when favorites are full', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 'id')
    const full = Array.from({ length: MAX_FAVORITES }, (_, index) => `api:${String(index + 2)}`)
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(full))
    const rendered = await renderToggle()
    const button = screen.getByRole('button', { name: 'Favorite Rick Sanchez' })

    await rendered.user.click(button)

    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(rendered.emitted('change')).toBeUndefined()
    expect(toastError).toHaveBeenCalledWith('Limit reached', {
      id: 'favorites-limit',
      description: 'You can save up to 500 heroes and 2,000 favorites.',
    })
  })
})
