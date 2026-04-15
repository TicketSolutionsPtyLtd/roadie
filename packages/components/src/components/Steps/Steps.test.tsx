import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Steps, stepsVariants } from '.'

describe('Steps', () => {
  it('Steps and Steps.Root are the same component reference', () => {
    expect(Steps).toBe(Steps.Root)
  })

  it('renders with default props', () => {
    const { container } = render(
      <Steps count={3}>
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>
              <Steps.Indicator>1</Steps.Indicator>
            </Steps.Trigger>
            <Steps.Separator />
          </Steps.Item>
          <Steps.Item index={1}>
            <Steps.Trigger>
              <Steps.Indicator>2</Steps.Indicator>
            </Steps.Trigger>
            <Steps.Separator />
          </Steps.Item>
          <Steps.Item index={2}>
            <Steps.Trigger>
              <Steps.Indicator>3</Steps.Indicator>
            </Steps.Trigger>
          </Steps.Item>
        </Steps.List>
        <Steps.Content index={0}>Step 1 content</Steps.Content>
        <Steps.Content index={1}>Step 2 content</Steps.Content>
        <Steps.Content index={2}>Step 3 content</Steps.Content>
      </Steps>
    )
    expect(container.firstElementChild).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('grid', 'w-full', 'gap-4')
  })

  it('renders default horizontal orientation variant', () => {
    const classes = stepsVariants()
    expect(classes).toContain('grid')
    expect(classes).toContain('w-full')
    expect(classes).toContain('gap-4')
  })

  it('renders vertical direction variant', () => {
    const classes = stepsVariants({ direction: 'vertical' })
    expect(classes).toContain('grid-cols-[auto_1fr]')
    expect(classes).toContain('gap-3')
  })

  it('applies custom className via variants', () => {
    const classes = stepsVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })

  it('renders indicators with correct base classes', () => {
    const { container } = render(
      <Steps count={2}>
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>
              <Steps.Indicator>1</Steps.Indicator>
            </Steps.Trigger>
            <Steps.Separator />
          </Steps.Item>
          <Steps.Item index={1}>
            <Steps.Trigger>
              <Steps.Indicator>2</Steps.Indicator>
            </Steps.Trigger>
          </Steps.Item>
        </Steps.List>
        <Steps.Content index={0}>Content 1</Steps.Content>
        <Steps.Content index={1}>Content 2</Steps.Content>
      </Steps>
    )
    const indicators = container.querySelectorAll('[data-part="indicator"]')
    expect(indicators).toHaveLength(2)
    expect(indicators[0]).toHaveClass('rounded-full', 'font-black')
  })

  it('renders separators', () => {
    const { container } = render(
      <Steps count={2}>
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>
              <Steps.Indicator>1</Steps.Indicator>
            </Steps.Trigger>
            <Steps.Separator />
          </Steps.Item>
          <Steps.Item index={1}>
            <Steps.Trigger>
              <Steps.Indicator>2</Steps.Indicator>
            </Steps.Trigger>
          </Steps.Item>
        </Steps.List>
        <Steps.Content index={0}>Content 1</Steps.Content>
        <Steps.Content index={1}>Content 2</Steps.Content>
      </Steps>
    )
    const separators = container.querySelectorAll('[data-part="separator"]')
    expect(separators.length).toBeGreaterThan(0)
    expect(separators[0]).toHaveClass('bg-subtle')
  })

  it('renders content for the active step', () => {
    const { getByText } = render(
      <Steps count={2} defaultStep={0}>
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>
              <Steps.Indicator>1</Steps.Indicator>
            </Steps.Trigger>
            <Steps.Separator />
          </Steps.Item>
          <Steps.Item index={1}>
            <Steps.Trigger>
              <Steps.Indicator>2</Steps.Indicator>
            </Steps.Trigger>
          </Steps.Item>
        </Steps.List>
        <Steps.Content index={0}>First step</Steps.Content>
        <Steps.Content index={1}>Second step</Steps.Content>
      </Steps>
    )
    expect(getByText('First step')).toBeVisible()
    expect(getByText('Second step')).not.toBeVisible()
  })

  it('passes custom className to sub-components', () => {
    const { container } = render(
      <Steps count={1} className='custom-root'>
        <Steps.List className='custom-list'>
          <Steps.Item index={0} className='custom-item'>
            <Steps.Trigger className='custom-trigger'>
              <Steps.Indicator className='custom-indicator'>1</Steps.Indicator>
            </Steps.Trigger>
          </Steps.Item>
        </Steps.List>
        <Steps.Content index={0} className='custom-content'>
          Content
        </Steps.Content>
      </Steps>
    )
    expect(container.firstElementChild).toHaveClass('custom-root')
    expect(container.querySelector('[data-part="list"]')).toHaveClass(
      'custom-list'
    )
    expect(container.querySelector('[data-part="item"]')).toHaveClass(
      'custom-item'
    )
    expect(container.querySelector('[data-part="trigger"]')).toHaveClass(
      'custom-trigger'
    )
    expect(container.querySelector('[data-part="indicator"]')).toHaveClass(
      'custom-indicator'
    )
    expect(container.querySelector('[data-part="content"]')).toHaveClass(
      'custom-content'
    )
  })

  it('renders progress bar', () => {
    const { container } = render(
      <Steps count={3} defaultStep={1}>
        <Steps.Progress />
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>
              <Steps.Indicator>1</Steps.Indicator>
            </Steps.Trigger>
          </Steps.Item>
        </Steps.List>
        <Steps.Content index={0}>Content</Steps.Content>
      </Steps>
    )
    const progress = container.querySelector('[data-part="progress"]')
    expect(progress).toBeInTheDocument()
    expect(progress).toHaveClass('bg-subtle', 'rounded-sm')
  })
})
