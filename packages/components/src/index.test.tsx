/// <reference types="@testing-library/jest-dom" />
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button, Code, Heading, Text, View } from './index'

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

  it('exports Heading component', () => {
    expect(Heading).toBeDefined()
    const { container } = render(<Heading>Test</Heading>)
    expect(container).toBeInTheDocument()
  })

  it('exports Text component', () => {
    expect(Text).toBeDefined()
    const { container } = render(<Text>Test</Text>)
    expect(container).toBeInTheDocument()
  })

  it('exports View component', () => {
    expect(View).toBeDefined()
    const { container } = render(<View>Test</View>)
    expect(container).toBeInTheDocument()
  })
})
