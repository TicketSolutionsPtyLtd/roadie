import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button, Code, Highlight, Mark } from './index'

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

  it('exports Highlight component', () => {
    expect(Highlight).toBeDefined()
    const { container } = render(<Highlight text='Test' query='Te' />)
    expect(container).toBeInTheDocument()
  })
})
