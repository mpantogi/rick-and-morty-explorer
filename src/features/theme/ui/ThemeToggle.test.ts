import { render, screen } from '@testing-library/vue'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import ThemeToggle from './ThemeToggle.vue'

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.className = ''
  })

  it('is a toggle button with a stable name that reports its pressed state', async () => {
    const user = userEvent.setup()
    render(ThemeToggle)
    const toggle = screen.getByRole('button', { name: 'Dark theme' })

    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveClass('dark')
  })
})
