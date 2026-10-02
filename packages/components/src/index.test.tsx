import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  Button,
  Calendar,
  Code,
  DateField,
  DatePicker,
  Highlight,
  Kbd,
  Mark,
  type NumberFieldStepperEmphasis,
  TimeField
} from './index'

describe('Component exports', () => {
  it('exports Button component', () => {
    expect(Button).toBeDefined()
    const { container } = render(<Button>Test</Button>)
    expect(container).toBeInTheDocument()
  })

  it('exports Code component', () => {
    expect(Code).toBeDefined()
    const { container } = render(<Code>Test</Code>)
    expect(container).toBeInTheDocument()
  })

  it('exports Mark component', () => {
    expect(Mark).toBeDefined()
    const { container } = render(<Mark>Test</Mark>)
    expect(container).toBeInTheDocument()
  })

  it('exports the NumberField stepper emphasis type', () => {
    const emphasis: NumberFieldStepperEmphasis = 'strong'
    expect(emphasis).toBe('strong')
  })

  it('exports Kbd component', () => {
    const { container } = render(<Kbd>Enter</Kbd>)
    expect(container.querySelector('kbd')).toHaveTextContent('Enter')
  })

  it('exports the date and time fields', () => {
    const { getAllByRole } = render(
      <>
        <DateField aria-label='Date' />
        <TimeField aria-label='Time' />
        <DatePicker aria-label='Show date' />
      </>
    )
    expect(getAllByRole('textbox')).toHaveLength(3)
  })

  it('exports Calendar component', () => {
    const { getAllByRole } = render(<Calendar today='2027-03-10' />)
    expect(getAllByRole('grid')).toHaveLength(1)
  })

  it('exports Highlight component', () => {
    expect(Highlight).toBeDefined()
    const { container } = render(<Highlight text='Test' query='Te' />)
    expect(container).toBeInTheDocument()
  })
})
