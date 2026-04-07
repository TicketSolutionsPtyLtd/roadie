import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Label } from '.'

describe('Label', () => {
  it('renders with default classes', () => {
    const { container } = render(<Label>Name</Label>)
    const label = container.querySelector('label')
    expect(label).toHaveClass('text-sm', 'font-medium', 'text-normal')
  })

  it('renders children', () => {
    const { getByText } = render(<Label>Email address</Label>)
    expect(getByText('Email address')).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    const { container } = render(<Label className='custom'>Name</Label>)
    const label = container.querySelector('label')
    expect(label).toHaveClass('custom')
    expect(label).toHaveClass('text-sm')
  })

  it('passes htmlFor to native label', () => {
    const { container } = render(<Label htmlFor='email'>Email</Label>)
    const label = container.querySelector('label')
    expect(label).toHaveAttribute('for', 'email')
  })
})
