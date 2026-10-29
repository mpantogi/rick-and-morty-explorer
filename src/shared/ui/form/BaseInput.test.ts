import { render, screen } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import BaseInput from './BaseInput.vue'

describe('BaseInput', () => {
  it('shows the bound value, emits what the user types and follows the parent', async () => {
    const user = userEvent.setup()
    const view = render(BaseInput, {
      props: { modelValue: 'Rick', id: 'name' },
      attrs: { 'aria-label': 'Name' },
    })
    const input = screen.getByRole('textbox', { name: 'Name' })

    expect(input).toHaveValue('Rick')

    await user.type(input, 'y')
    expect(view.emitted('update:modelValue')).toEqual([['Ricky']])

    await view.rerender({ modelValue: 'Morty' })
    expect(input).toHaveValue('Morty')
  })

  it('passes native attributes through to the input', () => {
    render(BaseInput, {
      props: { modelValue: '', id: 'name' },
      attrs: { type: 'search', maxlength: '100', 'aria-label': 'Name' },
    })

    const input = screen.getByRole('searchbox', { name: 'Name' })

    expect(input).toHaveAttribute('id', 'name')
    expect(input).toHaveAttribute('maxlength', '100')
  })

  it("puts a parent's BEM mix right after its own block, before any utility", () => {
    render(BaseInput, {
      props: { modelValue: '', id: 'species' },
      attrs: { class: 'species-combobox__input pr-11', 'aria-label': 'Species' },
    })

    expect([...screen.getByRole('textbox', { name: 'Species' }).classList].slice(0, 3)).toEqual([
      'input',
      'species-combobox__input',
      'pr-11',
    ])
  })
})
