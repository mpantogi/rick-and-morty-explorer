import { fireEvent, screen, within } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { renderWithApp } from '../../../../test/render'
import { useCharacterFilters } from '../model/use-character-filters'
import CharacterFiltersForm from './CharacterFiltersForm.vue'

// Mounts the form with a real controller, the way the character browser does.
const Host = defineComponent({
  setup() {
    const controller = useCharacterFilters()
    return () => h(CharacterFiltersForm, { controller })
  },
})

async function setup(route = '/') {
  const rendered = await renderWithApp(Host, { route })
  const query = () => rendered.router.currentRoute.value.query
  return { ...rendered, query }
}

describe('CharacterFiltersForm', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is a labelled search landmark with a labelled control for every filter', async () => {
    await setup()

    const form = screen.getByRole('search', { name: 'Filter characters' })
    expect(within(form).getByRole('searchbox', { name: 'Name' })).toHaveAttribute(
      'maxlength',
      '100',
    )
    expect(within(form).getByRole('combobox', { name: 'Status' })).toBeInTheDocument()
    expect(within(form).getByRole('combobox', { name: 'Species' })).toBeInTheDocument()
    expect(within(form).getByRole('textbox', { name: 'Type' })).toBeInTheDocument()
    expect(within(form).getByRole('combobox', { name: 'Gender' })).toBeInTheDocument()
  })

  it('offers every status and gender with an "any" option first', async () => {
    const { user } = await setup()

    const optionsOf = async (name: string) => {
      await user.click(screen.getByRole('combobox', { name }))
      const labels = within(screen.getByRole('listbox', { name }))
        .getAllByRole('option')
        .map((option) => option.textContent.trim())
      await user.keyboard('{Escape}')
      return labels
    }
    expect(await optionsOf('Status')).toEqual(['Any status', 'Alive', 'Dead', 'Unknown'])
    expect(await optionsOf('Gender')).toEqual([
      'Any gender',
      'Female',
      'Male',
      'Genderless',
      'Unknown',
    ])
  })

  it('suggests the known species from the species button', async () => {
    const { user } = await setup()

    await user.click(screen.getByRole('button', { name: 'Species' }))

    expect(
      within(screen.getByRole('listbox', { name: 'Species' })).getByRole('option', {
        name: 'Mythological Creature',
      }),
    ).toBeInTheDocument()
  })

  it('shows the applied filters in the controls', async () => {
    await setup('/?name=rick&status=dead&gender=male')

    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('rick')
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Dead')
    expect(screen.getByRole('combobox', { name: 'Gender' })).toHaveTextContent('Male')
  })

  it('opens and closes the filter panel from its toggle', async () => {
    const { user } = await setup()
    const toggle = screen.getByRole('button', { name: 'Filters' })
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveClass('hidden')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel).not.toHaveClass('hidden')
  })

  it('counts only the filters inside its panel on the toggle', async () => {
    await setup('/?name=rick&status=dead&type=parasite')

    expect(screen.getByRole('button', { name: 'Filters 2 active' })).toHaveTextContent('(2)')
  })

  it('shows no count on the toggle for a name search, yet offers Reset filters', async () => {
    await setup('/?name=zzzz')

    expect(screen.getByRole('button', { name: 'Filters' })).not.toHaveTextContent(/\(\d+\)/)
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
  })

  it('applies a status at once', async () => {
    const { user, query } = await setup()

    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(screen.getByRole('option', { name: 'Alive' }))

    await vi.waitFor(() => {
      expect(query()).toEqual({ status: 'alive' })
    })
  })

  it('applies typed text on submit, without waiting for the typing pause', async () => {
    const { query } = await setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await fireEvent.update(screen.getByRole('searchbox', { name: 'Name' }), 'morty')
    await fireEvent.submit(screen.getByRole('search', { name: 'Filter characters' }))
    // A macrotask lets the router settle while the faked 300 ms debounce never fires.
    await new Promise((resolve) => setImmediate(resolve))

    expect(query()).toEqual({ name: 'morty' })
  })

  it('applies a picked species at once', async () => {
    const { query } = await setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await fireEvent.update(screen.getByRole('combobox', { name: 'Species' }), 'ali')
    await fireEvent.click(screen.getByRole('option', { name: 'Alien' }))
    await new Promise((resolve) => setImmediate(resolve))

    expect(query()).toEqual({ species: 'Alien' })
  })

  it('offers Reset filters only while a filter is applied', async () => {
    const { user, query } = await setup('/?name=rick')

    await user.click(screen.getByRole('button', { name: 'Reset filters' }))

    await vi.waitFor(() => {
      expect(query()).toEqual({})
    })
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('')
  })

  it('moves focus to the name search when Reset filters disappears', async () => {
    const { user } = await setup('/?species=alien')

    await user.click(screen.getByRole('button', { name: 'Reset filters' }))

    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveFocus()
  })
})
