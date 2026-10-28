import { render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import BaseSkeleton from './BaseSkeleton.vue'

describe('BaseSkeleton', () => {
  it('is a hidden placeholder that takes its size from the caller', () => {
    const { container } = render(BaseSkeleton, { attrs: { class: 'h-4 w-24' } })
    const skeleton = container.firstElementChild

    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    expect(skeleton?.classList[0]).toBe('skeleton')
    expect(skeleton).toHaveClass('h-4', 'w-24', 'motion-safe:animate-pulse')
  })

  it("puts a parent's BEM mix right after its own block, before any utility", () => {
    const { container } = render(BaseSkeleton, {
      attrs: { class: 'card-skeleton__name h-4 w-24' },
    })

    expect([...(container.firstElementChild?.classList ?? [])].slice(0, 2)).toEqual([
      'skeleton',
      'card-skeleton__name',
    ])
  })
})
