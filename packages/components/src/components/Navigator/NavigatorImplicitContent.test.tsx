import { Fragment } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { Pane } from '../Pane'
import { flushViewportMeasurement, testBrand } from './testUtils'

describe('implicit Navigator.Content', () => {
  it('wraps loose children in a generated Content without one written', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
        <Pane>Detail</Pane>
      </Navigator>
    )
    await flushViewportMeasurement()

    const content = document.querySelector('[data-slot="navigator-content"]')
    expect(content).not.toBeNull()
    const pane = screen.getByText('Detail').closest('[data-slot="pane"]')
    expect(content).toContainElement(pane as HTMLElement)
    expect(pane).toHaveAttribute('data-stack-position', 'top')
  })

  it('still honours an explicit Navigator.Content, unchanged', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content className='custom-main'>
          <Pane>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()

    const content = document.querySelector('[data-slot="navigator-content"]')
    expect(content).toHaveClass('custom-main')
    expect(
      document.querySelectorAll('[data-slot="navigator-content"]')
    ).toHaveLength(1)
  })

  it('registers panes carried in separate fragments, as parallel-route slots arrive', async () => {
    const listSlot = (
      <Fragment>
        <Pane column='list'>List</Pane>
      </Fragment>
    )
    const detailSlot = (
      <Fragment>
        <Pane>Detail</Pane>
      </Fragment>
    )
    render(
      <Navigator value='/a/1'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
        {listSlot}
        {detailSlot}
      </Navigator>
    )
    await flushViewportMeasurement()

    const panes = Array.from(document.querySelectorAll('[data-slot="pane"]'))
    expect(panes).toHaveLength(2)
    expect(panes[0]?.parentElement).toBe(panes[1]?.parentElement)
    expect(panes[0]?.parentElement).toHaveAttribute(
      'data-slot',
      'navigator-panes'
    )
    expect(panes[1]).toHaveAttribute('data-stack-position', 'top')
  })

  it('renders Primary before the generated Content regardless of source order', async () => {
    render(
      <Navigator value='/a'>
        <Pane>Detail</Pane>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const root = document.querySelector('[data-slot="navigator"]')
    const primary = root?.querySelector('[data-slot="navigator-primary"]')
    const content = root?.querySelector('[data-slot="navigator-content"]')
    expect(primary).not.toBeNull()
    expect(content).not.toBeNull()
    expect(
      primary!.compareDocumentPosition(content!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('generates an (empty) Content even with no other children, so More always has a host', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    expect(
      document.querySelector('[data-slot="navigator-content"]')
    ).not.toBeNull()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
