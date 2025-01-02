import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { View } from './index'

describe('View', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(<View data-testid='view'>Content</View>)
    const view = getByTestId('view')
    expect(view).toBeInTheDocument()
    expect(view.tagName.toLowerCase()).toBe('div')
    expect(view).toHaveClass(
      'd_flex',
      'pos_relative',
      'flex-d_column',
      'flex-wrap_nowrap',
      'ai_stretch',
      'ac_flex-start',
      'jc_flex-start',
      'min-h_0',
      'min-w_0'
    )
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
        <View as={element} data-testid='view'>
          {element} content
        </View>
      )
      const view = getByTestId('view')
      expect(view.tagName.toLowerCase()).toBe(element)
      expect(view).toHaveClass(
        'd_flex',
        'pos_relative',
        'flex-d_column',
        'flex-wrap_nowrap',
        'ai_stretch',
        'ac_flex-start',
        'jc_flex-start',
        'min-h_0',
        'min-w_0'
      )
      rerender(<></>)
    })
  })

  it('applies layout properties', () => {
    const { getByTestId } = render(
      <View
        data-testid='view'
        display='inline-flex'
        position='absolute'
        flexDirection='row'
        flexWrap='wrap'
        alignItems='center'
        alignContent='center'
        justifyContent='center'
      >
        Styled View
      </View>
    )
    const view = getByTestId('view')
    expect(view).toHaveClass(
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
      <View
        data-testid='view'
        backgroundColor='bg.subtle'
        padding='200'
        title='tooltip'
        aria-label='Accessible view'
      >
        Custom View
      </View>
    )
    const view = getByTestId('view')
    expect(view).toHaveClass('bg-c_bg.subtle', 'p_200')
    expect(view).toHaveAttribute('title', 'tooltip')
    expect(view).toHaveAttribute('aria-label', 'Accessible view')
  })

  it('renders nested views', () => {
    const { getByTestId } = render(
      <View data-testid='parent'>
        <View data-testid='child'>Nested Content</View>
      </View>
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
      'min-w_0'
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
      'min-w_0'
    )
  })

  it('combines multiple props', () => {
    const { getByTestId } = render(
      <View
        as='section'
        display='grid'
        gap='200'
        padding='400'
        backgroundColor='bg.subtle'
        className='custom-class'
        data-testid='view'
      >
        Combined styles
      </View>
    )
    const view = getByTestId('view')
    expect(view.tagName.toLowerCase()).toBe('section')
    expect(view).toHaveClass('d_grid', 'gap_200', 'p_400', 'bg-c_bg.subtle', 'custom-class')
  })
})
