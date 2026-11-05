import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Switch } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(() => cleanup())

function resolve(colour: string) {
  const probe = document.createElement('div')
  probe.style.color = colour
  document.body.append(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved
}

const track = () => getComputedStyle(screen.getByRole('switch'))

describe('Switch', () => {
  it.each([
    ['sm', 20],
    ['md', 24]
  ] as const)('stands %s at %ipx', (size, height) => {
    render(<Switch aria-label='Presale alerts' size={size} />)
    expect(screen.getByRole('switch').getBoundingClientRect().height).toBe(
      height
    )
  })

  it('stands md by default', () => {
    render(<Switch aria-label='Presale alerts' />)
    expect(screen.getByRole('switch').getBoundingClientRect().height).toBe(24)
  })

  it('fills the checked track with accent', () => {
    render(<Switch aria-label='Presale alerts' defaultChecked />)
    expect(track().backgroundColor).toBe(resolve('var(--color-accent-9)'))
  })

  it('keeps the checked track accent when invalid, with a danger edge', () => {
    render(<Switch aria-label='Presale alerts' defaultChecked invalid />)
    expect(track().backgroundColor).toBe(resolve('var(--color-accent-9)'))
    expect(track().borderTopColor).toBe(resolve('var(--color-danger-9)'))
  })
})

describe('a disabled Switch with a label', () => {
  const row = (disabled: boolean) => (
    <Switch
      label='Presale alerts'
      description='Before tickets go on sale'
      disabled={disabled}
    />
  )
  const label = () => screen.getByText('Presale alerts')
  const text = () => label().parentElement!

  it('dims its label and description and stops the pointer', () => {
    render(row(true))
    expect(getComputedStyle(text()).opacity).toBe('0.5')
    expect(getComputedStyle(label()).cursor).toBe('not-allowed')
  })

  it('leaves them alone when enabled', () => {
    render(row(false))
    expect(getComputedStyle(text()).opacity).toBe('1')
    expect(getComputedStyle(label()).cursor).toBe('pointer')
  })

  it('follows disabled as it changes', () => {
    const { rerender } = render(row(false))
    rerender(row(true))
    expect(getComputedStyle(text()).opacity).toBe('0.5')
  })
})
