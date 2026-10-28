import { fireEvent, screen, within } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { toast } from 'vue-sonner'

import { STORAGE_KEYS } from '@/shared/config'

import { renderWithApp } from '../../../../test/render'
import CreateHeroForm from './CreateHeroForm.vue'

const MAX_HEROES = 500
const PREVIEW_PAUSE_MS = 400
const IMAGE = 'https://example.com/pete.png'
const NAME_HINT = '2 to 60 characters.'
const IMAGE_HINT = 'A direct link to an image, starting with https://.'

async function setup() {
  const rendered = await renderWithApp(CreateHeroForm, { route: '/heroes/new' })
  return {
    ...rendered,
    name: () => screen.getByRole('textbox', { name: 'Name' }),
    image: () => screen.getByRole('textbox', { name: 'Image URL' }),
    gender: () => screen.getByRole('group', { name: 'Gender' }),
    submit: () => screen.getByRole('button', { name: 'Create hero' }),
  }
}

// jsdom names no figure after its caption, so the caption is checked on its own.
function previewFigure(): HTMLElement {
  const figure = screen.getByRole('figure')
  expect(within(figure).getByText('Preview').tagName).toBe('FIGCAPTION')
  return figure
}

function savedHeroes(): unknown[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.heroes) ?? '[]') as unknown[]
}

describe('CreateHeroForm', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('labels every field and describes the text fields with their hints', async () => {
    const { name, image, gender } = await setup()

    expect(name()).toHaveAttribute('maxlength', '60')
    expect(name()).toBeRequired()
    expect(name()).toHaveAccessibleDescription(NAME_HINT)
    expect(image()).toHaveAttribute('type', 'url')
    expect(image()).toHaveAttribute('inputmode', 'url')
    expect(image()).toHaveAccessibleDescription(IMAGE_HINT)
    expect(
      within(gender())
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['female', 'male', 'genderless', 'unknown'])
    expect(within(gender()).getByRole('radio', { name: 'Genderless' })).toBeInTheDocument()
  })

  it('shows no error before the visitor leaves a field or submits', async () => {
    const { user, name } = await setup()

    await user.type(name(), 'R')

    expect(name()).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('Use at least 2 characters.')).not.toBeInTheDocument()
  })

  it('shows the name error once the visitor leaves the field', async () => {
    const { user, name } = await setup()

    await user.type(name(), 'R')
    await user.tab()

    await vi.waitFor(() => {
      expect(name()).toHaveAccessibleDescription(`${NAME_HINT} Use at least 2 characters.`)
    })
    expect(name()).toHaveAttribute('aria-invalid', 'true')
    expect(name()).toHaveAccessibleErrorMessage('Use at least 2 characters.')
  })

  it('marks every empty field invalid on submit and focuses the name', async () => {
    const { user, name, image, gender, submit } = await setup()

    await user.click(submit())

    await vi.waitFor(() => {
      expect(name()).toHaveFocus()
    })
    expect(name()).toHaveAccessibleErrorMessage('Enter a name.')
    expect(image()).toHaveAccessibleErrorMessage('Enter an image URL.')
    for (const radio of within(gender()).getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-invalid', 'true')
      expect(radio).toHaveAccessibleErrorMessage('Choose a gender.')
    }
    expect(savedHeroes()).toEqual([])
  })

  it('focuses the first radio when the gender is the first invalid field', async () => {
    const { user, name, image, gender, submit } = await setup()

    await user.type(name(), 'Portal Pete')
    await user.type(image(), IMAGE)
    await user.click(submit())

    await vi.waitFor(() => {
      expect(within(gender()).getByRole('radio', { name: 'Female' })).toHaveFocus()
    })
  })

  it('rejects an image that is not a secure web address', async () => {
    const { user, image, submit } = await setup()

    await user.type(image(), 'javascript:alert(1)')
    await user.click(submit())

    await vi.waitFor(() => {
      expect(image()).toHaveAccessibleErrorMessage(
        'Enter a secure image URL starting with https://.',
      )
    })
  })

  it('creates the hero, confirms it and opens the character list', async () => {
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 'id')
    const { user, router, name, image, gender, submit } = await setup()

    await user.type(name(), '  Portal Pete ')
    await user.click(within(gender()).getByRole('radio', { name: 'Male' }))
    await user.type(image(), IMAGE)
    await user.click(submit())

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe('/')
    })
    expect(savedHeroes()).toEqual([
      expect.objectContaining({ name: 'Portal Pete', gender: 'male', image: IMAGE }),
    ])
    expect(success).toHaveBeenCalledWith('Hero created', {
      description: 'Portal Pete is now first in the character list.',
    })
  })

  it('keeps the form and explains the limit when heroes are full', async () => {
    const limit = vi.spyOn(toast, 'error').mockImplementation(() => 'id')
    const full = Array.from({ length: MAX_HEROES }, () => ({
      id: crypto.randomUUID(),
      name: 'Saved',
      gender: 'female',
      image: IMAGE,
      createdAt: '2026-10-28T12:00:00.000Z',
    }))
    localStorage.setItem(STORAGE_KEYS.heroes, JSON.stringify(full))
    const { user, router, name, image, gender, submit } = await setup()

    await user.type(name(), 'Portal Pete')
    await user.click(within(gender()).getByRole('radio', { name: 'Male' }))
    await user.type(image(), IMAGE)
    await user.click(submit())

    await vi.waitFor(() => {
      expect(limit).toHaveBeenCalledWith('Limit reached', {
        id: 'storage-limit',
        description: 'You can save up to 500 heroes and 2,000 favorites.',
      })
    })
    expect(router.currentRoute.value.path).toBe('/heroes/new')
    expect(savedHeroes()).toHaveLength(MAX_HEROES)
  })

  it('previews a valid image after a pause and explains a broken one', async () => {
    const { user, image } = await setup()
    const preview = previewFigure()
    expect(within(preview).getByText('Your image will appear here.')).toBeInTheDocument()

    await user.type(image(), IMAGE)

    const picture = await vi.waitFor(() => {
      const found = preview.querySelector('img')
      if (!found) throw new Error('No preview image yet')
      return found
    })
    expect(picture).toHaveAttribute('src', IMAGE)
    expect(picture).toHaveAttribute('referrerpolicy', 'no-referrer')

    await fireEvent.error(picture)

    expect(preview.querySelector('img')).not.toBeInTheDocument()
    expect(within(preview).getByRole('status')).toHaveTextContent(
      "We couldn't load this image. You can still create the hero, and a placeholder will show instead.",
    )
  })

  it('previews only secure images, once the visitor pauses', async () => {
    const { image } = await setup()
    const preview = previewFigure()
    vi.useFakeTimers()

    await fireEvent.update(image(), 'http://example.com/pete.png')
    await vi.advanceTimersByTimeAsync(PREVIEW_PAUSE_MS)
    await nextTick()
    expect(preview.querySelector('img')).toBeNull()

    await fireEvent.update(image(), IMAGE)
    await vi.advanceTimersByTimeAsync(PREVIEW_PAUSE_MS - 1)
    await nextTick()
    expect(preview.querySelector('img')).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    await nextTick()
    expect(preview.querySelector('img')).toHaveAttribute('src', IMAGE)
  })
})
