import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import BaseBadge from './BaseBadge.vue'

describe('BaseBadge', () => {
  it.each(['neutral', 'success', 'danger', 'accent'] as const)(
    'renders its label as a %s pill',
    (tone) => {
      render(BaseBadge, { props: { tone }, slots: { default: 'Alive' } })
      const badge = screen.getByText('Alive')

      expect([...badge.classList].slice(0, 2)).toEqual(['badge', `badge--${tone}`])
    },
  )

  it('adds a dot that assistive technology ignores when asked', () => {
    const { container } = render(BaseBadge, {
      props: { tone: 'success', dot: true },
      slots: { default: 'Alive' },
    })

    expect(container.querySelector('.badge__dot')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Alive')).toHaveTextContent(/^Alive$/)
  })

  it('renders no dot by default', () => {
    const { container } = render(BaseBadge, {
      props: { tone: 'neutral' },
      slots: { default: 'Unknown' },
    })

    expect(container.querySelector('.badge__dot')).toBeNull()
  })
})
