import { createRef } from 'react'

import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { resolveRender } from './resolveRender'

function Probe(props: {
  render?: Parameters<typeof resolveRender>[2]
  className?: string
  onClick?: React.MouseEventHandler
  ref?: React.Ref<HTMLElement>
  children?: React.ReactNode
}) {
  const { render: renderProp, ...defaults } = props
  return resolveRender('div', defaults, renderProp)
}

describe('resolveRender', () => {
  it('renders the default element when no render prop is set', () => {
    const { getByText } = render(<Probe className='base'>Hello</Probe>)
    const el = getByText('Hello')
    expect(el.tagName.toLowerCase()).toBe('div')
    expect(el).toHaveClass('base')
  })

  it('swaps the element via the element form', () => {
    const { getByText } = render(
      <Probe className='base' render={<a href='/x' />}>
        Hello
      </Probe>
    )
    const el = getByText('Hello')
    expect(el.tagName.toLowerCase()).toBe('a')
    expect(el).toHaveAttribute('href', '/x')
    expect(el).toHaveClass('base')
  })

  it('merges className: default + render contribute', () => {
    const { getByText } = render(
      <Probe className='base' render={<a className='extra' href='/x' />}>
        Hi
      </Probe>
    )
    expect(getByText('Hi')).toHaveClass('base', 'extra')
  })

  it('chains onClick handlers (default first, then render override)', async () => {
    const user = userEvent.setup()
    const order: string[] = []
    const defaultClick = () => order.push('default')
    const overrideClick = () => order.push('override')

    const { getByText } = render(
      <Probe
        onClick={defaultClick}
        render={<button type='button' onClick={overrideClick} />}
      >
        Click
      </Probe>
    )
    await user.click(getByText('Click'))
    expect(order).toEqual(['default', 'override'])
  })

  it('forwards ref via element form', () => {
    const componentRef = createRef<HTMLAnchorElement>()
    render(
      <Probe ref={componentRef} render={<a href='/x' />}>
        Hi
      </Probe>
    )
    expect(componentRef.current?.tagName.toLowerCase()).toBe('a')
  })

  it('merges component-level ref with render-level ref', () => {
    const componentRef = createRef<HTMLAnchorElement>()
    const renderRef = createRef<HTMLAnchorElement>()
    render(
      <Probe ref={componentRef} render={<a ref={renderRef} href='/x' />}>
        Hi
      </Probe>
    )
    expect(componentRef.current).not.toBeNull()
    expect(renderRef.current).not.toBeNull()
    expect(componentRef.current).toBe(renderRef.current)
  })

  it('uses the function form with default props in hand', () => {
    const { getByText } = render(
      <Probe
        className='base'
        render={(props) => (
          <button
            data-from-fn='1'
            {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            type='button'
          />
        )}
      >
        Func
      </Probe>
    )
    const el = getByText('Func')
    expect(el.tagName.toLowerCase()).toBe('button')
    expect(el).toHaveClass('base')
    expect(el).toHaveAttribute('data-from-fn', '1')
  })

  it('non-className/non-event props: render override wins over default', () => {
    const { getByTestId } = render(
      <Probe render={<a data-testid='final' href='/x' data-section='render' />}>
        Hi
      </Probe>
    )
    expect(getByTestId('final')).toHaveAttribute('data-section', 'render')
  })

  it('renders the override component (component form)', () => {
    const Custom = vi.fn(
      ({ children, ...rest }: { children?: React.ReactNode }) => (
        <a data-testid='custom' {...rest}>
          {children}
        </a>
      )
    )
    const { getByTestId } = render(
      <Probe className='base' render={<Custom href='/x' />}>
        Hi
      </Probe>
    )
    const el = getByTestId('custom')
    expect(el).toHaveClass('base')
    expect(el).toHaveAttribute('href', '/x')
    expect(Custom).toHaveBeenCalled()
  })
})
