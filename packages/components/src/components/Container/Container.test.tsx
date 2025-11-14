import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Container } from './index'

describe('Container', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(
      <Container data-testid='container'>Content</Container>
    )
    const container = getByTestId('container')
    expect(container).toBeInTheDocument()
    expect(container.tagName.toLowerCase()).toBe('div')
    expect(container).toHaveClass(
      'd_flex',
      'pos_relative',
      'flex-d_column',
      'flex-wrap_nowrap',
      'ai_stretch',
      'ac_flex-start',
      'jc_flex-start',
      'min-h_0',
      'min-w_0',
      'w_full',
      'mx_auto',
      'max-w_7xl'
    )
  })

  it('applies responsive padding by default', () => {
    const { getByTestId } = render(
      <Container data-testid='container'>Content</Container>
    )
    const container = getByTestId('container')
    // Should have responsive padding classes
    expect(container.className).toMatch(/px_/)
  })

  it('renders with contain true by default (constrained width)', () => {
    const { getByTestId } = render(
      <Container data-testid='container'>Constrained Content</Container>
    )
    const container = getByTestId('container')
    expect(container).toHaveClass('max-w_7xl')
  })

  it('renders with contain=false (full width)', () => {
    const { getByTestId } = render(
      <Container contain={false} data-testid='container'>
        Full Width Content
      </Container>
    )
    const container = getByTestId('container')
    expect(container).toHaveClass('max-w_full')
  })

  it('renders with contain prop explicitly set to true', () => {
    const { getByTestId } = render(
      <Container contain data-testid='container'>
        Constrained Content
      </Container>
    )
    const container = getByTestId('container')
    expect(container).toHaveClass('max-w_7xl')
  })

  it('renders with different HTML elements', () => {
    const elements: Array<'section' | 'article' | 'aside' | 'main'> = [
      'section',
      'article',
      'aside',
      'main'
    ]

    elements.forEach((element) => {
      const { rerender, getByTestId } = render(
        <Container as={element} data-testid='container'>
          {element} content
        </Container>
      )
      const container = getByTestId('container')
      expect(container.tagName.toLowerCase()).toBe(element)
      expect(container).toHaveClass(
        'd_flex',
        'pos_relative',
        'flex-d_column',
        'flex-wrap_nowrap',
        'ai_stretch',
        'ac_flex-start',
        'jc_flex-start',
        'min-h_0',
        'min-w_0',
        'w_full',
        'mx_auto'
      )
      rerender(<></>)
    })
  })

  it('applies layout properties', () => {
    const { getByTestId } = render(
      <Container
        data-testid='container'
        display='inline-flex'
        position='absolute'
        flexDirection='row'
        flexWrap='wrap'
        alignItems='center'
        alignContent='center'
        justifyContent='center'
      >
        Styled Container
      </Container>
    )
    const container = getByTestId('container')
    expect(container).toHaveClass(
      'd_inline-flex',
      'pos_absolute',
      'flex-d_row',
      'flex-wrap_wrap',
      'ai_center',
      'ac_center',
      'jc_center',
      'min-h_0',
      'min-w_0'
    )
  })

  it('applies custom styles and attributes', () => {
    const { getByTestId } = render(
      <Container
        data-testid='container'
        backgroundColor='neutral.bg.subtle'
        padding='200'
        title='tooltip'
        aria-label='Accessible container'
      >
        Custom Container
      </Container>
    )
    const container = getByTestId('container')
    expect(container).toHaveClass('bg-c_neutral.bg.subtle', 'p_200')
    expect(container).toHaveAttribute('title', 'tooltip')
    expect(container).toHaveAttribute('aria-label', 'Accessible container')
  })

  it('renders nested containers', () => {
    const { getByTestId } = render(
      <Container data-testid='parent'>
        <Container data-testid='child'>Nested Content</Container>
      </Container>
    )
    const parent = getByTestId('parent')
    const child = getByTestId('child')
    expect(parent).toContainElement(child)
    expect(child).toHaveTextContent('Nested Content')
    expect(parent).toHaveClass(
      'd_flex',
      'pos_relative',
      'flex-d_column',
      'flex-wrap_nowrap',
      'ai_stretch',
      'ac_flex-start',
      'jc_flex-start',
      'min-h_0',
      'min-w_0',
      'w_full',
      'mx_auto'
    )
    expect(child).toHaveClass(
      'd_flex',
      'pos_relative',
      'flex-d_column',
      'flex-wrap_nowrap',
      'ai_stretch',
      'ac_flex-start',
      'jc_flex-start',
      'min-h_0',
      'min-w_0',
      'w_full',
      'mx_auto'
    )
  })

  it('combines multiple props including contain', () => {
    const { getByTestId } = render(
      <Container
        as='section'
        contain
        display='grid'
        gap='200'
        padding='400'
        backgroundColor='neutral.bg.subtle'
        className='custom-class'
        data-testid='container'
      >
        Combined styles
      </Container>
    )
    const container = getByTestId('container')
    expect(container.tagName.toLowerCase()).toBe('section')
    expect(container).toHaveClass(
      'd_grid',
      'gap_200',
      'p_400',
      'bg-c_neutral.bg.subtle',
      'max-w_7xl',
      'custom-class'
    )
  })

  it('can override default padding', () => {
    const { getByTestId } = render(
      <Container data-testid='container' px='800'>
        Custom Padding
      </Container>
    )
    const container = getByTestId('container')
    expect(container).toHaveClass('px_800')
  })

  it('can override default width', () => {
    const { getByTestId } = render(
      <Container data-testid='container' width='auto'>
        Custom Width
      </Container>
    )
    const container = getByTestId('container')
    expect(container).toHaveClass('w_auto')
  })

  it('can set contain=false for full width', () => {
    const { getByTestId } = render(
      <Container contain={false} data-testid='container'>
        Full Width
      </Container>
    )
    const container = getByTestId('container')
    expect(container).toHaveClass('max-w_full')
  })
})
