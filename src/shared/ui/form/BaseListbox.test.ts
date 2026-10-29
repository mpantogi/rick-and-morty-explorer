import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import BaseListbox from './BaseListbox.vue'

const OPTIONS = [
  { value: 'alive', label: 'Alive' },
  { value: 'dead', label: 'Dead' },
] as const

function renderListbox() {
  return render(BaseListbox, {
    props: {
      id: 'status-listbox',
      labelId: 'status-label',
      options: OPTIONS,
      selected: 'dead',
      activeIndex: 0,
      optionId: (index: number) => `status-option-${String(index)}`,
    },
  })
}

describe('BaseListbox', () => {
  it('marks the selected option and gives each option the id the control points to', () => {
    renderListbox()

    expect(screen.getByRole('option', { name: 'Dead' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Alive' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('option', { name: 'Alive' })).toHaveAttribute('id', 'status-option-0')
  })

  it('reports a pick on click and a new active option on hover, not the one already active', async () => {
    const view = renderListbox()

    await fireEvent.pointerMove(screen.getByRole('option', { name: 'Alive' }))
    await fireEvent.pointerMove(screen.getByRole('option', { name: 'Dead' }))
    await fireEvent.click(screen.getByRole('option', { name: 'Dead' }))

    expect(view.emitted('activate')).toEqual([[1]])
    expect(view.emitted('pick')).toEqual([[1]])
  })
})
