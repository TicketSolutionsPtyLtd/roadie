import { MinusIcon, TrashIcon } from '@phosphor-icons/react/ssr'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { NumberField, numberFieldGroupVariants } from '.'
import { Field } from '../Field'

// jsdom never upgrades the custom element, so its update hooks don't exist.
vi.mock('@number-flow/react', async () => {
  const { createElement } = await import('react')
  return {
    default: ({ value, className, ...props }: Record<string, unknown>) =>
      createElement(
        'number-flow-react',
        { ...props, class: className },
        String(value)
      )
  }
})

describe('NumberField', () => {
  it('NumberField and NumberField.Root are the same component reference', () => {
    expect(NumberField).toBe(NumberField.Root)
  })

  it('renders a stepper by default', () => {
    const { container } = render(
      <NumberField aria-label='Tickets' defaultValue={1} />
    )
    expect(
      container.querySelector('[data-slot="number-field"]')
    ).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="number-field-group"]')
    ).toBeInTheDocument()
    const decrease = screen.getByRole('button', { name: 'Decrease' })
    expect(decrease).toHaveAttribute('data-slot', 'number-field-decrement')
    expect(decrease).toHaveClass('is-interactive', 'emphasis-subtler')
    expect(screen.getByRole('button', { name: 'Increase' })).toHaveAttribute(
      'data-slot',
      'number-field-increment'
    )
    expect(screen.getByRole('textbox', { name: 'Tickets' })).toHaveValue('1')
  })

  it('renders composed children instead of the default stepper', () => {
    render(
      <NumberField defaultValue={3}>
        <NumberField.Group>
          <NumberField.Input aria-label='Seats' />
        </NumberField.Group>
      </NumberField>
    )
    expect(screen.getByRole('textbox', { name: 'Seats' })).toHaveValue('3')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('steps with the buttons and stops at max', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <NumberField
        aria-label='Tickets'
        defaultValue={9}
        min={0}
        max={10}
        onValueChange={onValueChange}
      />
    )
    const increase = screen.getByRole('button', { name: 'Increase' })
    await user.click(increase)
    expect(screen.getByRole('textbox')).toHaveValue('10')
    expect(onValueChange).toHaveBeenLastCalledWith(10, expect.anything())
    expect(increase).toBeDisabled()
  })

  it('disables decrement at min', () => {
    render(<NumberField aria-label='Tickets' defaultValue={0} min={0} />)
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase' })).not.toBeDisabled()
  })

  it('steps with the arrow keys', () => {
    render(<NumberField aria-label='Tickets' defaultValue={2} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input).toHaveValue('3')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveValue('1')
  })

  it('formats with Intl options', () => {
    render(
      <NumberField
        aria-label='Donation'
        locale='en-AU'
        defaultValue={25}
        format={{ style: 'currency', currency: 'AUD' }}
      />
    )
    expect(screen.getByRole('textbox')).toHaveValue('$25.00')
  })

  it('applies size and emphasis from the root to the group', () => {
    const { container } = render(
      <NumberField aria-label='Tickets' size='lg' emphasis='subtle' />
    )
    const group = container.querySelector('[data-slot="number-field-group"]')
    expect(group).toHaveClass('h-12')
    expect(group).toHaveClass('bg-subtle')
  })

  it('disables the whole field', () => {
    render(<NumberField aria-label='Tickets' defaultValue={2} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
  })

  it('marks the steppers unavailable when read only', () => {
    render(<NumberField aria-label='Tickets' defaultValue={2} readOnly />)
    const increase = screen.getByRole('button', { name: 'Increase' })
    expect(increase).toHaveAttribute('aria-disabled', 'true')
    expect(increase).toHaveClass('data-[readonly]:opacity-50')
  })

  describe('group variants', () => {
    it('defaults to the field emphasis without an intent', () => {
      const classes = numberFieldGroupVariants()
      expect(classes).toContain('emphasis-field')
      expect(classes).toContain('is-interactive-field-group')
      expect(classes).toContain('h-10')
      expect(classes).not.toContain('intent-')
    })

    it('sizes', () => {
      expect(numberFieldGroupVariants({ size: 'sm' })).toContain('h-8')
      expect(numberFieldGroupVariants({ size: 'lg' })).toContain('h-12')
    })
  })

  describe('inside Field', () => {
    it('wires the label, helper text and required state', () => {
      render(
        <Field required>
          <Field.Label>Tickets</Field.Label>
          <NumberField min={0} max={10} defaultValue={1} />
          <Field.HelperText>Up to 10 per order</Field.HelperText>
        </Field>
      )
      const input = screen.getByRole('textbox', { name: 'Tickets' })
      expect(input).toBeRequired()
      expect(input).toHaveAccessibleDescription('Up to 10 per order')
    })

    it('inherits invalid and points at the error text', () => {
      const { container } = render(
        <Field invalid>
          <Field.Label>Tickets</Field.Label>
          <NumberField defaultValue={0} />
          <Field.ErrorText>Choose at least one ticket</Field.ErrorText>
        </Field>
      )
      const input = screen.getByRole('textbox', { name: 'Tickets' })
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription('Choose at least one ticket')
      expect(
        container.querySelector('[data-slot="number-field-group"]')
      ).toHaveAttribute('aria-invalid', 'true')
    })

    it('inherits disabled', () => {
      render(
        <Field disabled>
          <Field.Label>Tickets</Field.Label>
          <NumberField defaultValue={1} />
        </Field>
      )
      expect(screen.getByRole('textbox', { name: 'Tickets' })).toBeDisabled()
    })

    it('lets root props override the Field', () => {
      render(
        <Field invalid>
          <Field.Label>Tickets</Field.Label>
          <NumberField invalid={false} defaultValue={1} />
        </Field>
      )
      expect(
        screen.getByRole('textbox', { name: 'Tickets' })
      ).not.toHaveAttribute('aria-invalid')
    })
  })

  it('renders a scrub area', () => {
    const { container } = render(
      <NumberField defaultValue={5}>
        <NumberField.ScrubArea>
          <label htmlFor='volume'>Volume</label>
        </NumberField.ScrubArea>
        <NumberField.Group>
          <NumberField.Input id='volume' />
        </NumberField.Group>
      </NumberField>
    )
    expect(
      container.querySelector('[data-slot="number-field-scrub-area"]')
    ).toHaveClass('cursor-ew-resize')
  })

  describe('subtler emphasis', () => {
    it('drops the field box and renders round standalone buttons', () => {
      const { container } = render(
        <NumberField aria-label='Tickets' emphasis='subtler' defaultValue={1} />
      )
      const group = container.querySelector('[data-slot="number-field-group"]')
      expect(group).toHaveClass('gap-2')
      expect(group).not.toHaveClass('emphasis-field')
      expect(group).not.toHaveClass('is-interactive-field-group')
      const decrease = screen.getByRole('button', { name: 'Decrease' })
      expect(decrease).toHaveClass(
        'btn',
        'is-interactive',
        'emphasis-normal',
        'btn-icon-md'
      )
      expect(decrease).not.toHaveClass('emphasis-subtler')
    })

    it('gives an editable value a subtle field chip', () => {
      const { rerender } = render(
        <NumberField aria-label='Tickets' emphasis='subtler' defaultValue={1} />
      )
      expect(screen.getByRole('textbox')).toHaveClass(
        'bg-subtle',
        'is-interactive-field',
        'rounded-md'
      )
      rerender(
        <NumberField
          aria-label='Tickets'
          emphasis='subtler'
          defaultValue={1}
          editable={false}
        />
      )
      expect(screen.getByRole('textbox')).not.toHaveClass(
        'bg-subtle',
        'is-interactive-field'
      )
    })

    it('keeps the chip off boxed fields', () => {
      render(<NumberField aria-label='Tickets' defaultValue={1} />)
      expect(screen.getByRole('textbox')).not.toHaveClass(
        'is-interactive-field'
      )
    })

    it('sizes the buttons like IconButton', () => {
      render(<NumberField aria-label='Tickets' emphasis='subtler' size='sm' />)
      expect(screen.getByRole('button', { name: 'Increase' })).toHaveClass(
        'btn-icon-sm'
      )
    })
  })

  describe('part emphasis and intent', () => {
    it('styles a standalone increment', () => {
      render(
        <NumberField emphasis='subtler' defaultValue={1}>
          <NumberField.Group>
            <NumberField.Decrement />
            <NumberField.Input aria-label='Tickets' />
            <NumberField.Increment emphasis='strong' intent='accent' />
          </NumberField.Group>
        </NumberField>
      )
      const increase = screen.getByRole('button', { name: 'Increase' })
      expect(increase).toHaveClass('emphasis-strong', 'intent-accent')
      expect(increase).not.toHaveClass('emphasis-normal')
      expect(screen.getByRole('button', { name: 'Decrease' })).toHaveClass(
        'emphasis-normal'
      )
    })

    it('overrides the in-field button emphasis', () => {
      render(
        <NumberField defaultValue={1}>
          <NumberField.Group>
            <NumberField.Input aria-label='Tickets' />
            <NumberField.Increment emphasis='subtle' intent='accent' />
          </NumberField.Group>
        </NumberField>
      )
      const increase = screen.getByRole('button', { name: 'Increase' })
      expect(increase).toHaveClass('emphasis-subtle', 'intent-accent')
      expect(increase).not.toHaveClass('emphasis-subtler')
    })
  })

  describe('removable', () => {
    const trash = renderToStaticMarkup(<TrashIcon weight='bold' />)
    const minus = renderToStaticMarkup(<MinusIcon weight='bold' />)
    const iconPath = (html: string) => html.match(/<path[^>]*>/)?.[0]

    it('swaps to a remove button one step above min', async () => {
      const user = userEvent.setup()
      render(
        <NumberField aria-label='Tickets' defaultValue={2} min={0} removable />
      )
      const decrease = screen.getByRole('button', { name: 'Decrease' })
      expect(decrease.innerHTML).toContain(iconPath(minus))
      await user.click(decrease)
      const remove = screen.getByRole('button', { name: 'Remove' })
      expect(remove.innerHTML).toContain(iconPath(trash))
      await user.click(remove)
      expect(screen.getByRole('textbox')).toHaveValue('0')
      expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
    })

    it('respects step', () => {
      render(
        <NumberField
          aria-label='Tickets'
          value={2}
          step={2}
          min={0}
          removable
        />
      )
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    })

    it('works when composed', () => {
      render(
        <NumberField defaultValue={1} min={0} removable emphasis='subtler'>
          <NumberField.Group>
            <NumberField.Decrement />
            <NumberField.Input aria-label='Tickets' />
            <NumberField.Increment />
          </NumberField.Group>
        </NumberField>
      )
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    })

    it('keeps the minus without removable', () => {
      render(<NumberField aria-label='Tickets' defaultValue={1} min={0} />)
      expect(
        screen.getByRole('button', { name: 'Decrease' })
      ).toBeInTheDocument()
    })
  })

  describe('editable', () => {
    it('blocks typing but keeps the buttons and keys working', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <NumberField
          aria-label='Tickets'
          defaultValue={3}
          min={0}
          max={10}
          editable={false}
        />
      )
      const input = screen.getByRole('textbox', { name: 'Tickets' })
      expect(input).toHaveAttribute('readonly')

      await user.click(input)
      await user.keyboard('7')
      expect(input).toHaveValue('3')
      expect(input).toHaveClass('text-transparent')

      fireEvent.keyDown(input, { key: 'ArrowUp' })
      expect(input).toHaveValue('4')
      fireEvent.keyDown(input, { key: 'End' })
      expect(input).toHaveValue('10')

      const decrease = screen.getByRole('button', { name: 'Decrease' })
      expect(decrease).not.toHaveAttribute('aria-disabled', 'true')
      await user.click(decrease)
      expect(input).toHaveValue('9')
      expect(container.querySelector('number-flow-react')).not.toHaveClass(
        'opacity-0'
      )
    })

    it('differs from readOnly, which also stops stepping', async () => {
      const user = userEvent.setup()
      render(
        <>
          <NumberField aria-label='Read only' defaultValue={3} readOnly />
          <NumberField aria-label='Fixed' defaultValue={3} editable={false} />
        </>
      )
      const [readOnlyIncrease, fixedIncrease] = screen.getAllByRole('button', {
        name: 'Increase'
      })
      await user.click(readOnlyIncrease!)
      await user.click(fixedIncrease!)
      expect(screen.getByRole('textbox', { name: 'Read only' })).toHaveValue(
        '3'
      )
      expect(readOnlyIncrease).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByRole('textbox', { name: 'Fixed' })).toHaveValue('4')
    })

    it('keeps a tap target when editable and hugs the number when not', () => {
      const { container, rerender } = render(
        <NumberField aria-label='Tickets' emphasis='subtler' editable={false} />
      )
      const cell = () =>
        container.querySelector('[data-slot="number-field-value"]')
      expect(cell()).toHaveClass(
        'min-w-[calc(var(--number-field-chars)*1ch+1rem)]'
      )
      rerender(<NumberField aria-label='Tickets' emphasis='subtler' />)
      expect(cell()?.className).toContain('2.75rem')
      expect(cell()?.className).toContain('pointer-coarse:')
    })
  })

  describe('value width', () => {
    const chars = (container: HTMLElement) =>
      (
        container.querySelector(
          '[data-slot="number-field-value"]'
        ) as HTMLElement
      ).style.getPropertyValue('--number-field-chars')

    it('sizes from the widest formatted bound', () => {
      expect(
        chars(render(<NumberField aria-label='A' min={0} max={10} />).container)
      ).toBe('2')
      expect(
        chars(
          render(<NumberField aria-label='B' min={0} max={999} />).container
        )
      ).toBe('3')
      expect(chars(render(<NumberField aria-label='C' />).container)).toBe('3')
      expect(
        chars(
          render(<NumberField aria-label='D' min={-1000} max={10} />).container
        )
      ).toBe(String((-1000).toLocaleString().length))
    })

    it('counts currency symbols and decimals', () => {
      const { container } = render(
        <NumberField
          aria-label='Donation'
          locale='en-AU'
          format={{ style: 'currency', currency: 'AUD' }}
          min={0}
          max={500}
        />
      )
      expect(chars(container)).toBe(String('$500.00'.length))
    })

    it('fits its content by default and stretches on request', () => {
      const { container, rerender } = render(
        <NumberField aria-label='Tickets' />
      )
      const root = () => container.querySelector('[data-slot="number-field"]')
      expect(root()).toHaveClass('w-fit')
      rerender(<NumberField aria-label='Tickets' className='w-full' />)
      expect(root()).toHaveClass('w-full')
      expect(root()).not.toHaveClass('w-fit')
    })
  })

  describe('animated value', () => {
    it('shows the animated number at rest and the input while editing', () => {
      const { container } = render(
        <NumberField aria-label='Tickets' defaultValue={3} />
      )
      const input = screen.getByRole('textbox', { name: 'Tickets' })
      const flow = container.querySelector('number-flow-react')
      expect(flow).toHaveAttribute('aria-hidden', 'true')
      expect(flow).not.toHaveClass('opacity-0')
      expect(input).toHaveClass('text-transparent')

      fireEvent.pointerDown(input)
      expect(input).not.toHaveClass('text-transparent')
      expect(container.querySelector('number-flow-react')).toHaveClass(
        'opacity-0'
      )

      fireEvent.blur(input)
      expect(input).toHaveClass('text-transparent')

      fireEvent.keyDown(input, { key: '5' })
      expect(input).not.toHaveClass('text-transparent')
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(input).toHaveClass('text-transparent')
    })

    it('keeps animating when stepping with the buttons or arrow keys', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <NumberField aria-label='Tickets' defaultValue={3} />
      )
      const input = screen.getByRole('textbox')
      await user.click(screen.getByRole('button', { name: 'Increase' }))
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      expect(input).toHaveValue('5')
      expect(input).toHaveClass('text-transparent')
      expect(container.querySelector('number-flow-react')).toHaveTextContent(
        '5'
      )
    })

    it('hands back to the animation when a button steps while editing', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <NumberField aria-label='Tickets' defaultValue={3} />
      )
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Control>}a{/Control}7')
      expect(input).not.toHaveClass('text-transparent')
      expect(container.querySelector('number-flow-react')).toHaveClass(
        'opacity-0'
      )

      await user.click(screen.getByRole('button', { name: 'Increase' }))
      expect(input).toHaveValue('8')
      expect(input).toHaveClass('text-transparent')
      const flow = container.querySelector('number-flow-react')
      expect(flow).not.toHaveClass('opacity-0')
      expect(flow).toHaveTextContent('8')

      await user.type(input, '9')
      expect(input).not.toHaveClass('text-transparent')
    })

    it('hands back to the animation on arrow keys while editing', () => {
      render(<NumberField aria-label='Tickets' defaultValue={3} />)
      const input = screen.getByRole('textbox')
      fireEvent.pointerDown(input)
      expect(input).not.toHaveClass('text-transparent')
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      expect(input).toHaveValue('4')
      expect(input).toHaveClass('text-transparent')
    })

    it('shows the placeholder when empty', () => {
      const { container } = render(
        <NumberField>
          <NumberField.Group>
            <NumberField.Input aria-label='Tickets' placeholder='0' />
          </NumberField.Group>
        </NumberField>
      )
      expect(screen.getByRole('textbox')).not.toHaveClass('text-transparent')
      expect(container.querySelector('number-flow-react')).toBeNull()
    })

    it('shows the input text for notations it cannot animate', () => {
      const { container } = render(
        <NumberField
          aria-label='Distance'
          defaultValue={1200}
          format={{ notation: 'scientific' }}
        />
      )
      expect(screen.getByRole('textbox')).not.toHaveClass('text-transparent')
      expect(container.querySelector('number-flow-react')).toBeNull()
    })

    it('keeps the input as the only accessible control for the value', () => {
      render(<NumberField aria-label='Tickets' defaultValue={3} />)
      expect(screen.getAllByRole('textbox')).toHaveLength(1)
      expect(screen.queryByRole('spinbutton')).toBeNull()
    })
  })
})
