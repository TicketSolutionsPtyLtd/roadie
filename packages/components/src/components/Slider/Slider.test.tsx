import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Slider } from '.'
import { Field } from '../Field'

describe('Slider', () => {
  it('Slider and Slider.Root are the same component reference', () => {
    expect(Slider).toBe(Slider.Root)
  })

  it('renders control, track, indicator and one thumb by default', () => {
    const { container } = render(<Slider aria-label='Volume' />)
    expect(container.querySelector('[data-slot="slider"]')).toBeTruthy()
    expect(container.querySelector('[data-slot="slider-control"]')).toBeTruthy()
    expect(container.querySelector('[data-slot="slider-track"]')).toBeTruthy()
    expect(
      container.querySelector('[data-slot="slider-indicator"]')
    ).toBeTruthy()
    expect(screen.getAllByRole('slider')).toHaveLength(1)
  })

  it('renders one thumb per value', () => {
    render(<Slider aria-label='Price' defaultValue={[20, 80]} />)
    const thumbs = screen.getAllByRole('slider')
    expect(thumbs).toHaveLength(2)
    expect(thumbs[0]).toHaveValue('20')
    expect(thumbs[1]).toHaveValue('80')
  })

  it('names the thumbs from the label prop and shows the value', () => {
    render(<Slider label='Search radius' defaultValue={25} />)
    expect(
      screen.getByRole('slider', { name: 'Search radius' })
    ).toBeInTheDocument()
    expect(screen.getByText('25')).toHaveAttribute('data-slot', 'slider-value')
  })

  it('renders a label of 0', () => {
    render(<Slider label={0} defaultValue={25} />)
    expect(screen.getByRole('slider', { name: '0' })).toBeInTheDocument()
  })

  it('renders no label or value for an empty label', () => {
    const { container } = render(<Slider label='' aria-label='Radius' />)
    expect(container.querySelector('[data-slot="slider-label"]')).toBeNull()
    expect(container.querySelector('[data-slot="slider-value"]')).toBeNull()
  })

  it('formats the value in Australian English by default', () => {
    render(
      <Slider
        label='Price'
        defaultValue={[20, 80]}
        format={{
          style: 'currency',
          currency: 'AUD',
          maximumFractionDigits: 0
        }}
      />
    )
    expect(screen.getByText('$20 – $80')).toBeInTheDocument()
    expect(screen.getAllByRole('slider')[0]).toHaveAttribute(
      'aria-valuetext',
      '$20 start range'
    )
  })

  it('steps with the arrow keys and reports the value', async () => {
    const onValueChange = vi.fn()
    render(
      <Slider
        aria-label='Radius'
        defaultValue={10}
        step={5}
        onValueChange={onValueChange}
      />
    )
    const thumb = screen.getByRole('slider')
    await userEvent.tab()
    expect(thumb).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(thumb).toHaveValue('15')
    expect(onValueChange).toHaveBeenLastCalledWith(15, expect.anything())
  })

  it('disables the thumbs', async () => {
    const { container } = render(
      <Slider aria-label='Radius' defaultValue={10} disabled />
    )
    const thumb = screen.getByRole('slider')
    expect(thumb).toBeDisabled()
    expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute(
      'data-disabled'
    )
  })

  it('fills with fixed accent, ignoring the inherited intent', () => {
    const { container } = render(
      <div className='intent-brand'>
        <Slider aria-label='Radius' />
      </div>
    )
    expect(
      container.querySelector('[data-slot="slider-indicator"]')
    ).toHaveClass('bg-[var(--color-accent-9)]')
  })

  it('keeps the track neutral inside another intent', () => {
    const { container } = render(
      <div className='intent-brand'>
        <Slider aria-label='Radius' />
      </div>
    )
    expect(container.querySelector('[data-slot="slider-track"]')).toHaveClass(
      'intent-neutral',
      'emphasis-sunken'
    )
  })

  it('scales the thumb and track with size', () => {
    const { container } = render(<Slider aria-label='Radius' size='lg' />)
    expect(container.querySelector('[data-slot="slider-thumb"]')).toHaveClass(
      'size-6'
    )
    expect(container.querySelector('[data-slot="slider-track"]')).toHaveClass(
      'h-2'
    )
  })

  it('maps direction to a vertical slider', () => {
    render(<Slider aria-label='Level' direction='vertical' />)
    expect(screen.getByRole('slider')).toHaveAttribute(
      'aria-orientation',
      'vertical'
    )
  })

  it('marks the slider invalid', () => {
    const { container } = render(<Slider aria-label='Radius' invalid />)
    expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute(
      'data-invalid'
    )
    expect(screen.getByRole('slider')).toHaveAttribute('aria-invalid', 'true')
  })

  it('submits its value with a form', () => {
    const { container } = render(
      <form>
        <Slider aria-label='Radius' name='radius' defaultValue={30} />
      </form>
    )
    const form = container.querySelector('form')!
    expect(new FormData(form).get('radius')).toBe('30')
  })

  it('composes from parts', () => {
    render(
      <Slider.Root defaultValue={[100, 300]} max={500}>
        <Slider.Label>Price</Slider.Label>
        <Slider.Value />
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb index={0} aria-label='Minimum price' />
            <Slider.Thumb index={1} aria-label='Maximum price' />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    )
    expect(screen.getByRole('slider', { name: 'Minimum price' })).toHaveValue(
      '100'
    )
    expect(screen.getByRole('slider', { name: 'Maximum price' })).toHaveValue(
      '300'
    )
  })
})

describe('Field + Slider integration', () => {
  it('names the thumbs by its own label and describes them by the field text', () => {
    render(
      <Field>
        <Slider label='Search radius' defaultValue={[10, 40]} />
        <Field.HelperText>Events within this distance</Field.HelperText>
      </Field>
    )
    for (const thumb of screen.getAllByRole('slider')) {
      expect(thumb).toHaveAccessibleName('Search radius')
      expect(thumb).toHaveAccessibleDescription('Events within this distance')
    }
  })

  it('describes by the error text when the field is invalid', () => {
    render(
      <Field invalid>
        <Slider label='Price' defaultValue={40} />
        <Field.HelperText>Up to $250</Field.HelperText>
        <Field.ErrorText>Pick a lower price</Field.ErrorText>
      </Field>
    )
    expect(screen.getByRole('slider')).toHaveAccessibleDescription(
      'Pick a lower price'
    )
  })

  it('focuses the first thumb when its own label is clicked inside Field', async () => {
    render(
      <Field>
        <Slider label='Price' defaultValue={[20, 80]} />
      </Field>
    )
    await userEvent.click(screen.getByText('Price'))
    expect(screen.getAllByRole('slider')[0]).toHaveFocus()
  })

  it('describes by the helper text the field renders when only the slider is invalid', () => {
    render(
      <Field>
        <Field.Label>Price</Field.Label>
        <Slider invalid defaultValue={40} />
        <Field.HelperText>Up to $250</Field.HelperText>
      </Field>
    )
    expect(screen.getByRole('slider')).toHaveAccessibleDescription('Up to $250')
  })

  it('focuses the first thumb when Field.Label is clicked', async () => {
    render(
      <Field>
        <Field.Label>Price</Field.Label>
        <Slider defaultValue={[20, 80]} />
      </Field>
    )
    await userEvent.click(screen.getByText('Price'))
    expect(screen.getAllByRole('slider')[0]).toHaveFocus()
  })

  it('takes its name from Field.Label and its description from helper text', () => {
    render(
      <Field>
        <Field.Label>Search radius</Field.Label>
        <Slider defaultValue={25} />
        <Field.HelperText>Events within this distance</Field.HelperText>
      </Field>
    )
    const thumb = screen.getByRole('slider', { name: 'Search radius' })
    expect(thumb).toHaveAccessibleDescription('Events within this distance')
  })

  it('names itself from its own label of 0 inside Field', () => {
    render(
      <Field>
        <Field.Label>Search radius</Field.Label>
        <Slider label={0} defaultValue={25} />
      </Field>
    )
    expect(screen.getByRole('slider', { name: '0' })).toBeInTheDocument()
  })

  it('falls back to Field.Label when its own label is empty', () => {
    render(
      <Field>
        <Field.Label>Search radius</Field.Label>
        <Slider label='' defaultValue={25} />
      </Field>
    )
    expect(
      screen.getByRole('slider', { name: 'Search radius' })
    ).toBeInTheDocument()
  })

  it('inherits invalid and disabled from Field', () => {
    const { container } = render(
      <Field invalid disabled>
        <Field.Label>Price</Field.Label>
        <Slider defaultValue={[20, 80]} />
        <Field.ErrorText>Pick a narrower range</Field.ErrorText>
      </Field>
    )
    const thumbs = screen.getAllByRole('slider')
    for (const thumb of thumbs) {
      expect(thumb).toHaveAttribute('aria-invalid', 'true')
      expect(thumb).toBeDisabled()
      expect(thumb).toHaveAccessibleDescription('Pick a narrower range')
    }
    expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute(
      'data-invalid'
    )
  })

  it('props override Field context', () => {
    render(
      <Field invalid>
        <Field.Label>Price</Field.Label>
        <Slider invalid={false} />
      </Field>
    )
    expect(screen.getByRole('slider')).not.toHaveAttribute('aria-invalid')
  })
})
