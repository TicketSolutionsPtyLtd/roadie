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
})
