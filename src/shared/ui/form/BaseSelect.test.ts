import { render, screen } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import BaseSelect from './BaseSelect.vue'

const OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'alive', label: 'Alive' },
  { value: 'dead', label: 'Dead' },
] as const

function renderSelect(modelValue: string) {
  return render(BaseSelect, {
    props: { modelValue, id: 'status', options: OPTIONS },
    attrs: { 'aria-label': 'Status' },
  })
}

describe('BaseSelect', () => {
  it('lists every option in order and selects the bound value', () => {
    renderSelect('alive')

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Any status',
      'Alive',
      'Dead',
    ])
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('alive')
  })

  it('emits the chosen value and follows the parent', async () => {
    const user = userEvent.setup()
    const view = renderSelect('')
    const select = screen.getByRole('combobox', { name: 'Status' })

    await user.selectOptions(select, 'Dead')
    expect(view.emitted('update:modelValue')).toEqual([['dead']])

    await view.rerender({ modelValue: 'alive' })
    expect(select).toHaveValue('alive')
  })
})
