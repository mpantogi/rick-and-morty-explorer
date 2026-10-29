import { fireEvent, render, screen, within } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import BaseSelect from './BaseSelect.vue'

const OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'alive', label: 'Alive' },
  { value: 'dead', label: 'Dead' },
] as const

function setup(initial = 'alive') {
  const value = ref(initial)
  const Host = defineComponent({
    setup: () => () => [
      h('label', { id: 'status-label', for: 'status' }, 'Status'),
      h(BaseSelect, {
        id: 'status',
        labelId: 'status-label',
        options: OPTIONS,
        modelValue: value.value,
        'onUpdate:modelValue': (next: string) => {
          value.value = next
        },
      }),
      h('button', { type: 'button' }, 'Elsewhere'),
    ],
  })
  render(Host)
  return {
    user: userEvent.setup(),
    value,
    trigger: () => screen.getByRole('combobox', { name: 'Status' }),
    list: () => screen.getByRole('listbox', { name: 'Status' }),
  }
}

function optionLabels(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole('option')
    .map((option) => option.textContent.trim())
}

describe('BaseSelect', () => {
  it('is a collapsed combobox named by its label, showing the chosen option', () => {
    const { trigger } = setup()

    expect(trigger()).toHaveTextContent('Alive')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens on click with the chosen option marked, and picks another', async () => {
    const { user, value, trigger, list } = setup()

    await user.click(trigger())

    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(optionLabels(list())).toEqual(['Any status', 'Alive', 'Dead'])
    expect(within(list()).getByRole('option', { name: 'Alive' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(within(list()).getByRole('option', { name: 'Dead' }))

    expect(value.value).toBe('dead')
    expect(trigger()).toHaveTextContent('Dead')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveFocus()
  })

  it('opens from the keyboard on the chosen option, then moves and commits with Enter', async () => {
    const { user, value, trigger, list } = setup()
    trigger().focus()

    await user.keyboard('{ArrowDown}')
    const alive = within(list()).getByRole('option', { name: 'Alive' })
    expect(trigger()).toHaveAttribute('aria-activedescendant', alive.id)

    await user.keyboard('{ArrowDown}{Enter}')

    expect(value.value).toBe('dead')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).not.toHaveAttribute('aria-activedescendant')
  })

  it('jumps to the first and last options with Home and End', async () => {
    const { user, trigger, list } = setup()
    trigger().focus()

    await user.keyboard('{End}')
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      within(list()).getByRole('option', { name: 'Dead' }).id,
    )

    await user.keyboard('{Home}')
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      within(list()).getByRole('option', { name: 'Any status' }).id,
    )
  })

  it('moves up with the up arrow, commits with Alt+Up or Space, and opens on Home', async () => {
    const { user, value, trigger, list } = setup()
    trigger().focus()

    await user.keyboard('{ArrowDown}{ArrowUp}')
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      within(list()).getByRole('option', { name: 'Any status' }).id,
    )
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(value.value).toBe('')

    await user.keyboard('{Home}{End} ')
    expect(value.value).toBe('dead')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  // Safari and Firefox on macOS do not focus a clicked button, which a bare click event mirrors.
  it('takes focus when a click opens it, so the keys drive the list', async () => {
    const { user, trigger } = setup()

    await fireEvent.click(trigger())
    expect(trigger()).toHaveFocus()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(trigger()).toHaveTextContent('Dead')
  })

  it('closes on Escape without changing the value', async () => {
    const { user, value, trigger } = setup()
    trigger().focus()

    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}')

    expect(value.value).toBe('alive')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('commits the active option when Tab moves focus on', async () => {
    const { user, value, trigger } = setup()
    trigger().focus()

    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.tab()

    expect(value.value).toBe('dead')
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
  })

  it('moves to an option by the letters typed', async () => {
    const { user, trigger, list } = setup('')
    trigger().focus()

    await user.keyboard('de')

    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      within(list()).getByRole('option', { name: 'Dead' }).id,
    )
  })

  it('closes when the visitor clicks elsewhere', async () => {
    const { user, value, trigger } = setup()
    await user.click(trigger())

    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))

    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(value.value).toBe('alive')
  })

  it('follows a value the parent changes', async () => {
    const { value, trigger } = setup()

    value.value = 'dead'
    await nextTick()

    expect(trigger()).toHaveTextContent('Dead')
  })
})
