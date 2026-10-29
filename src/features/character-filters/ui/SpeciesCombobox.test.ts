import { render, screen, within } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { KNOWN_SPECIES } from '@/entities/character'

import SpeciesCombobox from './SpeciesCombobox.vue'

function setup(initial = '') {
  const value = ref(initial)
  const picked: string[] = []
  // Whether the field handled each Enter itself, as the filters form reads it.
  const enterHandled: boolean[] = []
  const Host = defineComponent({
    setup: () => () =>
      h(
        'div',
        {
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Enter') enterHandled.push(event.defaultPrevented)
          },
        },
        [
          h('label', { id: 'species-label', for: 'species' }, 'Species'),
          h(SpeciesCombobox, {
            id: 'species',
            labelId: 'species-label',
            modelValue: value.value,
            'onUpdate:modelValue': (next: string) => {
              value.value = next
            },
            onPick: (species: string) => {
              picked.push(species)
            },
          }),
          h('button', { type: 'button' }, 'Elsewhere'),
        ],
      ),
  })
  render(Host)
  return {
    user: userEvent.setup(),
    value,
    picked,
    enterHandled,
    field: () => screen.getByRole('combobox', { name: 'Species' }),
    list: () => screen.getByRole('listbox', { name: 'Species' }),
  }
}

function optionLabels(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole('option')
    .map((option) => option.textContent.trim())
}

describe('SpeciesCombobox', () => {
  it('is an editable combobox with list suggestions, named by its label', () => {
    const { field } = setup()

    expect(field()).toHaveAttribute('aria-autocomplete', 'list')
    expect(field()).toHaveAttribute('aria-expanded', 'false')
    expect(field()).toHaveAttribute('maxlength', '100')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('suggests the species that contain the typed text, none of them active yet', async () => {
    const { user, value, field, list } = setup()

    await user.type(field(), 'hum')

    expect(value.value).toBe('hum')
    expect(optionLabels(list())).toEqual(['Human', 'Humanoid'])
    expect(field()).not.toHaveAttribute('aria-activedescendant')
  })

  it('picks a suggestion with the arrow keys and Enter, and reports the pick', async () => {
    const { user, value, picked, enterHandled, field } = setup()
    await user.type(field(), 'hum')

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(value.value).toBe('Humanoid')
    expect(picked).toEqual(['Humanoid'])
    expect(enterHandled).toEqual([true])
    expect(field()).toHaveAttribute('aria-expanded', 'false')
  })

  it('moves from the typed text to the last suggestion with the up arrow', async () => {
    const { user, field, list } = setup()
    await user.type(field(), 'hum')

    await user.keyboard('{ArrowUp}')

    expect(field()).toHaveAttribute(
      'aria-activedescendant',
      within(list()).getByRole('option', { name: 'Humanoid' }).id,
    )
  })

  it('leaves Enter to the form while no suggestion is active, and closes the list', async () => {
    const { user, picked, enterHandled, field } = setup()

    await user.type(field(), 'hum{Enter}')

    expect(picked).toEqual([])
    expect(enterHandled).toEqual([false])
    expect(field()).toHaveAttribute('aria-expanded', 'false')
  })

  it.each(['{ArrowLeft}', '{ArrowRight}', '{Home}', '{End}'])(
    'returns to the typed text when %s moves the caret, so Enter applies the text',
    async (key) => {
      const { user, value, picked, enterHandled, field } = setup()
      await user.type(field(), 'hum{ArrowDown}')
      expect(field()).toHaveAttribute('aria-activedescendant')

      await user.keyboard(`${key}{Enter}`)

      expect(field()).not.toHaveAttribute('aria-activedescendant')
      expect(value.value).toBe('hum')
      expect(picked).toEqual([])
      expect(enterHandled).toEqual([false])
    },
  )

  it('picks a suggestion on click and keeps focus in the field', async () => {
    const { user, value, picked, field, list } = setup()
    await user.type(field(), 'ali')

    await user.click(within(list()).getByRole('option', { name: 'Alien' }))

    expect(value.value).toBe('Alien')
    expect(picked).toEqual(['Alien'])
    expect(field()).toHaveFocus()
  })

  it('shows every species from its button, with the current one marked', async () => {
    const { user, field, list } = setup('Alien')

    await user.click(screen.getByRole('button', { name: 'Species' }))

    const alien = within(list()).getByRole('option', { name: 'Alien' })
    expect(field()).toHaveFocus()
    expect(optionLabels(list())).toEqual([...KNOWN_SPECIES])
    expect(alien).toHaveAttribute('aria-selected', 'true')
    expect(field()).toHaveAttribute('aria-activedescendant', alien.id)
  })

  it('opens every species on the first one with the down arrow', async () => {
    const { user, field, list } = setup()
    field().focus()

    await user.keyboard('{ArrowDown}')

    expect(optionLabels(list())).toEqual([...KNOWN_SPECIES])
    expect(field()).toHaveAttribute(
      'aria-activedescendant',
      within(list()).getByRole('option', { name: 'Human' }).id,
    )
  })

  it('closes on Escape and keeps the typed text', async () => {
    const { user, value, field } = setup()
    await user.type(field(), 'rob')

    await user.keyboard('{Escape}')

    expect(field()).toHaveAttribute('aria-expanded', 'false')
    expect(value.value).toBe('rob')
  })

  it('closes when nothing matches, and when the visitor clicks elsewhere', async () => {
    const { user, field } = setup()

    await user.type(field(), 'zz')
    expect(field()).toHaveAttribute('aria-expanded', 'false')

    await user.clear(field())
    await user.type(field(), 'a')
    expect(field()).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))

    expect(field()).toHaveAttribute('aria-expanded', 'false')
  })
})
