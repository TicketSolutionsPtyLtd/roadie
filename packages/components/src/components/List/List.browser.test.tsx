import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { List } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeStill()
    removeRoadie()
  }
})
afterAll(() => removeStylesheets())
afterEach(() => cleanup())

const row = (title: string) =>
  screen.getByText(title).closest<HTMLElement>('[data-slot="list-item"]')!

const dividerShows = (title: string) => {
  const content = row(title).querySelector('[data-slot="list-item-content"]')!
  return (
    getComputedStyle(content, '::after').backgroundColor !== 'rgba(0, 0, 0, 0)'
  )
}

const dividers = (titles: string[]) => titles.map(dividerShows)

describe('List dividers', () => {
  const titles = ['Shows', 'Orders', 'Payouts']

  it('draws one between rows and none after the last', () => {
    render(
      <List>
        {titles.map((title) => (
          <List.Item key={title} title={title} />
        ))}
      </List>
    )
    expect(dividers(titles)).toEqual([true, true, false])
  })

  it('drops the ones around a hovered row', async () => {
    render(
      <List>
        {titles.map((title) => (
          <List.Item key={title} title={title} />
        ))}
      </List>
    )
    await userEvent.hover(row('Orders'))
    expect(dividers(titles)).toEqual([false, false, false])
    await userEvent.hover(row('Shows'))
    expect(dividers(titles)).toEqual([false, true, false])
  })

  it('drops the ones around the current row', () => {
    render(
      <List>
        <List.Item title='Shows' href='/shows' />
        <List.Item title='Orders' href='/orders' current='page' />
        <List.Item title='Payouts' href='/payouts' />
      </List>
    )
    expect(dividers(titles)).toEqual([false, false, false])
  })

  it('drops the ones around a keyboard-focused row', async () => {
    render(
      <List>
        {titles.map((title) => (
          <List.Item key={title} title={title} />
        ))}
      </List>
    )
    row('Shows').focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(row('Orders'))
    expect(dividers(titles)).toEqual([false, false, false])
  })
})

describe('contained List', () => {
  it('draws one card with square rows', () => {
    render(
      <List contained emphasis='subtle'>
        <List.Item title='Shows' />
        <List.Item title='Orders' />
      </List>
    )
    const style = getComputedStyle(row('Shows'))
    expect(style.borderTopLeftRadius).toBe('0px')
    expect(style.marginLeft).toBe('0px')
    expect(style.borderTopWidth).toBe('0px')
    expect(dividers(['Shows', 'Orders'])).toEqual([true, false])
  })

  it('gives loose rows beside groups their own surface and no dividers', () => {
    const { container } = render(
      <List contained emphasis='subtle'>
        <List.Item title='Shows' />
        <List.Item title='Orders' />
        <List.Group>
          <List.GroupTitle>Money</List.GroupTitle>
          <List.Item title='Payouts' />
          <List.Item title='Refunds' />
        </List.Group>
      </List>
    )
    const root = container.querySelector<HTMLElement>('[data-slot="list"]')!
    const section = container.querySelector<HTMLElement>(
      '[data-slot="list-section"]'
    )!
    const loose = getComputedStyle(row('Shows'))
    expect(loose.backgroundColor).toBe(
      getComputedStyle(section).backgroundColor
    )
    expect(loose.backgroundColor).not.toBe(
      getComputedStyle(root).backgroundColor
    )
    expect(loose.borderTopLeftRadius).not.toBe('0px')
    expect(dividers(['Shows', 'Orders'])).toEqual([false, false])
    expect(getComputedStyle(row('Payouts')).borderTopLeftRadius).toBe('0px')
    expect(dividers(['Payouts', 'Refunds'])).toEqual([true, false])
  })
})
