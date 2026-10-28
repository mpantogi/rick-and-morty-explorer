import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import EmptyState from './EmptyState.vue'

describe('EmptyState', () => {
  it('renders the title, the description and the action slot', () => {
    render(EmptyState, {
      props: { title: 'No favorites yet.', description: 'Use the heart on any character.' },
      slots: { action: '<a href="/">Browse characters</a>' },
    })

    expect(screen.getByText('No favorites yet.')).toBeInTheDocument()
    expect(screen.getByText('Use the heart on any character.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse characters' })).toBeInTheDocument()
  })

  it('renders no description paragraph when none is given', () => {
    const { container } = render(EmptyState, { props: { title: 'Nothing here.' } })

    expect(container.querySelectorAll('p')).toHaveLength(1)
  })
})
