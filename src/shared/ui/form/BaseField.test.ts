import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

import BaseField from './BaseField.vue'
import BaseInput from './BaseInput.vue'

type FieldControl = Parameters<InstanceType<typeof BaseField>['$slots']['default']>[0]

const HINT = '2 to 60 characters.'
const ERROR = 'Enter a name.'

function renderField(props: { hint?: string; error?: string } = {}) {
  return render(BaseField, {
    props: { label: 'Name', ...props },
    slots: {
      default: ({ id, describedBy, invalid, errorId }: FieldControl) =>
        h(BaseInput, {
          id,
          modelValue: '',
          'aria-describedby': describedBy,
          'aria-invalid': invalid,
          'aria-errormessage': errorId,
        }),
    },
  })
}

describe('BaseField', () => {
  it('labels the slotted BaseInput through for and id', () => {
    renderField()

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
  })

  it('describes the control with its hint and marks it valid while there is no error', () => {
    const { container } = renderField({ hint: HINT })
    const control = screen.getByRole('textbox', { name: 'Name' })

    expect(control).toHaveAccessibleDescription(HINT)
    expect(control).toHaveAttribute('aria-invalid', 'false')
    expect(control).not.toHaveAttribute('aria-errormessage')
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('adds the error to the description and links it as the error message', () => {
    renderField({ hint: HINT, error: ERROR })
    const control = screen.getByRole('textbox', { name: 'Name' })

    expect(control).toHaveAccessibleDescription(`${HINT} ${ERROR}`)
    expect(control).toHaveAttribute('aria-invalid', 'true')
    expect(control).toHaveAccessibleErrorMessage(ERROR)
    expect(screen.getByText(ERROR)).toHaveClass('text-danger')
  })

  it('describes the control by the error alone when there is no hint', () => {
    renderField({ error: ERROR })

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(ERROR)
  })

  it('leaves the control undescribed without a hint or an error', () => {
    renderField()

    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('aria-describedby')
  })
})
