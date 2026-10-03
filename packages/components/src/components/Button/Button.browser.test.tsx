import { type ReactNode } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Button, IconButton } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { Toggle } from '../Toggle'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const ROW = 80
const buttons: [string, ReactNode][] = [
  ['Button', <Button key='b'>Save</Button>],
  [
    'IconButton',
    <IconButton key='i' aria-label='Save'>
      <span />
    </IconButton>
  ],
  ['Toggle', <Toggle key='t'>Save</Toggle>]
]

function place(rowClass: string, button: ReactNode) {
  render(
    <div data-testid='row' className={rowClass} style={{ height: ROW }}>
      {button}
    </div>
  )
  const row = screen.getByTestId('row').getBoundingClientRect()
  const box = screen.getByRole('button').getBoundingClientRect()
  return {
    top: box.top - row.top,
    left: box.left - row.left,
    height: box.height,
    width: box.width,
    rowWidth: row.width
  }
}

describe.each(buttons)('%s alignment', (_, button) => {
  it('centres in a taller items-center flex row', () => {
    const { top, height } = place('flex items-center', button)
    expect(height).toBeLessThan(ROW)
    expect(top).toBeCloseTo((ROW - height) / 2, 0)
  })

  it('sits at the top of a taller items-start flex row', () => {
    const { top } = place('flex items-start', button)
    expect(top).toBe(0)
  })

  it('keeps its height at the top of a default flex row', () => {
    const { top, height } = place('flex', button)
    expect(top).toBe(0)
    expect(height).toBeLessThan(ROW)
  })

  it('sits at the start of a taller grid row without stretching', () => {
    const { top, left, height, width, rowWidth } = place('grid', button)
    expect(top).toBe(0)
    expect(left).toBe(0)
    expect(height).toBeLessThan(ROW)
    expect(width).toBeLessThan(rowWidth)
  })

  it('centres in a grid with justify-items-center', () => {
    const { left, width, rowWidth } = place('grid justify-items-center', button)
    expect(left).toBeCloseTo((rowWidth - width) / 2, 0)
  })

  it('keeps its width at the start of a default flex column', () => {
    const { left, width, rowWidth } = place('flex flex-col', button)
    expect(left).toBe(0)
    expect(width).toBeLessThan(rowWidth)
  })

  it('centres across an items-center flex column', () => {
    const { left, width, rowWidth } = place(
      'flex flex-col items-center',
      button
    )
    expect(left).toBeCloseTo((rowWidth - width) / 2, 0)
  })
})

describe('Button width overrides', () => {
  it('spans its cell with w-full', () => {
    const { width, rowWidth } = place(
      'grid',
      <Button className='w-full'>Save</Button>
    )
    expect(width).toBe(rowWidth)
  })

  it('keeps an IconButton square in a flex column', () => {
    const { width, height } = place(
      'flex flex-col',
      <IconButton aria-label='Save'>
        <span />
      </IconButton>
    )
    expect(width).toBe(height)
  })
})
