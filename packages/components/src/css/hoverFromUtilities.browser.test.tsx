import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Accordion } from '../components/Accordion'
import { Breadcrumb } from '../components/Breadcrumb'
import { Collapsible } from '../components/Collapsible'
import { Combobox } from '../components/Combobox'
import { navigatorItemVariants } from '../components/Navigator/variants'
import { useStylesheet } from '../components/Pane/testUtils'

const STILL = '*, *::before, *::after { transition-duration: 0s !important }'

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
afterEach(async () => {
  await commands.pointer([{ type: 'move', x: 0, y: 0 }])
  cleanup()
})

async function hover(element: Element) {
  const box = element.getBoundingClientRect()
  await commands.pointer([
    { type: 'move', x: box.x + box.width / 2, y: box.y + box.height / 2 }
  ])
}

const background = (element: Element) =>
  getComputedStyle(element).backgroundColor

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

function textLeft(element: Element) {
  const range = document.createRange()
  range.selectNodeContents(element.firstChild!)
  return range.getBoundingClientRect().left
}

describe('an Accordion trigger', () => {
  function Faq() {
    return (
      <Accordion>
        <Accordion.Item>
          <Accordion.Trigger>Can I bring a bag?</Accordion.Trigger>
          <Accordion.Content>Small bags only.</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
  }
  const trigger = () =>
    document.querySelector('[data-slot="accordion-trigger"]')!

  it('tints on hover and clears at rest', async () => {
    render(<Faq />)
    expect(background(trigger())).toBe(TRANSPARENT)
    await hover(trigger())
    await expect.poll(() => background(trigger())).not.toBe(TRANSPARENT)
  })

  it('keeps its text in line with the content below', () => {
    render(<Faq />)
    const content = document.querySelector('[data-slot="accordion-content"]')!
    expect(getComputedStyle(trigger()).borderTopWidth).toBe('0px')
    expect(getComputedStyle(trigger()).paddingInlineStart).toBe(
      getComputedStyle(content).paddingInlineStart
    )
  })
})

describe('a Collapsible trigger', () => {
  it('tints on hover and clears at rest', async () => {
    render(
      <Collapsible>
        <Collapsible.Trigger>Show all ticket types</Collapsible.Trigger>
        <Collapsible.Panel>Concession</Collapsible.Panel>
      </Collapsible>
    )
    const trigger = screen.getByRole('button')
    expect(background(trigger)).toBe(TRANSPARENT)
    await hover(trigger)
    await expect.poll(() => background(trigger)).not.toBe(TRANSPARENT)
  })

  it('keeps its text in line with the panel below', () => {
    render(
      <Collapsible defaultOpen>
        <Collapsible.Trigger>Show all ticket types</Collapsible.Trigger>
        <Collapsible.Panel>Concession</Collapsible.Panel>
      </Collapsible>
    )
    expect(textLeft(screen.getByText('Show all ticket types'))).toBe(
      textLeft(screen.getByText('Concession'))
    )
  })
})

describe('a Collapsible trigger in quiet text', () => {
  it('keeps the colour around it', () => {
    render(
      <p className='text-subtle'>
        <Collapsible>
          <Collapsible.Trigger>Show all ticket types</Collapsible.Trigger>
        </Collapsible>
      </p>
    )
    const trigger = screen.getByRole('button')
    expect(getComputedStyle(trigger).color).toBe(
      getComputedStyle(trigger.parentElement!).color
    )
  })
})

describe('a Combobox clear button', () => {
  it('tints on hover and clears at rest', async () => {
    render(
      <Combobox items={['Rock', 'Jazz']} defaultValue='Rock'>
        <Combobox.InputGroup>
          <Combobox.Input aria-label='Genre' />
          <Combobox.Clear aria-label='Clear genre' />
        </Combobox.InputGroup>
      </Combobox>
    )
    const clear = await screen.findByRole('button', { name: 'Clear genre' })
    expect(background(clear)).toBe(TRANSPARENT)
    await hover(clear)
    await expect.poll(() => background(clear)).not.toBe(TRANSPARENT)
  })
})

describe('a Navigator item', () => {
  it('tints on hover, borderless so its icon lines up with the active one', async () => {
    render(
      <div>
        <button className={navigatorItemVariants({ active: false })}>
          Events
        </button>
        <button className={navigatorItemVariants({ active: true })}>
          Insights
        </button>
      </div>
    )
    const idle = screen.getByRole('button', { name: 'Events' })
    const active = screen.getByRole('button', { name: 'Insights' })
    expect(getComputedStyle(idle).borderTopWidth).toBe(
      getComputedStyle(active).borderTopWidth
    )
    expect(background(idle)).toBe(TRANSPARENT)
    await hover(idle)
    await expect.poll(() => background(idle)).not.toBe(TRANSPARENT)
  })
})

describe('a Breadcrumb link', () => {
  it('underlines on hover', async () => {
    render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href='#events'>Events</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    const link = screen.getByRole('link', { name: 'Events' })
    const underline = () => getComputedStyle(link).textDecorationColor
    const rest = underline()
    await hover(link)
    await expect.poll(underline).not.toBe(rest)
  })
})
