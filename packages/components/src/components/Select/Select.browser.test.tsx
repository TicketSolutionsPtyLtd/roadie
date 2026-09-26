import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Select } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { Field } from '../Field'
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
afterEach(() => {
  setHoverCapable(true)
  cleanup()
})

const fill = (element: Element) => getComputedStyle(element).backgroundColor

async function tapJazz() {
  render(
    <Select multiple>
      <Select.Trigger aria-label='Genres'>
        <Select.Value placeholder='Pick genres' />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value='rock'>Rock</Select.Item>
        <Select.Item value='jazz'>Jazz</Select.Item>
      </Select.Content>
    </Select>
  )
  await userEvent.click(screen.getByRole('combobox', { name: 'Genres' }))
  const tapped = await screen.findByRole('option', { name: 'Jazz' })
  const resting = screen.getByRole('option', { name: 'Rock' })
  await userEvent.click(tapped)
  await expect.poll(() => tapped.getAttribute('aria-selected')).toBe('true')
  expect(tapped).toHaveAttribute('data-highlighted')
  return { resting, tapped }
}

describe('Select options on a touch screen', () => {
  it('drop the highlight once a tapped option leaves the list open', async () => {
    setHoverCapable(false)
    const { resting, tapped } = await tapJazz()

    expect(fill(tapped)).toBe(fill(resting))
  })

  it('still highlight under a pointer that can hover', async () => {
    setHoverCapable(true)
    const { resting, tapped } = await tapJazz()

    expect(fill(tapped)).not.toBe(fill(resting))
  })

  it('still highlight the option a keyboard moves to', async () => {
    setHoverCapable(false)
    render(
      <Select>
        <Select.Trigger aria-label='Genre'>
          <Select.Value placeholder='Pick a genre' />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value='rock'>Rock</Select.Item>
          <Select.Item value='jazz'>Jazz</Select.Item>
        </Select.Content>
      </Select>
    )
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    const first = await screen.findByRole('option', { name: 'Rock' })
    const second = screen.getByRole('option', { name: 'Jazz' })
    await expect.poll(() => document.activeElement).toBe(first)
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => document.activeElement).toBe(second)

    expect(fill(second)).not.toBe(fill(first))
  })
})

const BANDS = [
  ['bee-gees', 'Bee Gees'],
  ['custard', 'Custard'],
  ['powderfinger', 'Powderfinger'],
  ['regurgitator', 'Regurgitator'],
  ['long', 'The Midnight Paddock Collective and the Very Long Name Orchestra']
] as const

function Bands({
  multiple,
  defaultValue
}: {
  multiple?: boolean
  defaultValue: string | string[]
}) {
  return (
    <div data-testid='container' style={{ padding: 16 }}>
      <Field>
        <Field.Label>Bands</Field.Label>
        <Select multiple={multiple} defaultValue={defaultValue}>
          <Select.Trigger>
            <Select.Value placeholder='Pick bands' />
            <Select.Icon />
          </Select.Trigger>
          <Select.Content>
            {BANDS.map(([value, label]) => (
              <Select.Item key={value} value={value}>
                {label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </Field>
    </div>
  )
}

function measure() {
  const trigger = screen.getByRole('combobox')
  const field = trigger.parentElement!
  const icon = trigger.querySelector('[data-slot="select-icon"]')!
  const box = trigger.getBoundingClientRect()
  return {
    trigger,
    overflow: box.right - field.getBoundingClientRect().right,
    iconInside: icon.getBoundingClientRect().right <= box.right,
    shown: Array.from(
      trigger.querySelectorAll(
        '[data-slot="select-value-shown"], [data-slot="select-value-more"]'
      )
    )
      .map((part) => part.textContent)
      .join(' ')
  }
}

describe.each([
  ['a phone', 390, 844],
  ['a desktop', 1280, 800]
])('Select trigger on %s', (_, width, height) => {
  beforeAll(() => page.viewport(width, height))
  afterAll(() => page.viewport(1920, 1080))

  it.each([1, 2, 3, 4])(
    'stays inside its container with %i selected',
    async (count) => {
      render(
        <Bands
          multiple
          defaultValue={BANDS.slice(0, count).map(([value]) => value)}
        />
      )
      await expect.poll(() => measure().overflow).toBeLessThanOrEqual(0)
      expect(measure().iconInside).toBe(true)
    }
  )

  it('stays inside its container with a long label', async () => {
    render(<Bands defaultValue='long' />)
    await expect.poll(() => measure().overflow).toBeLessThanOrEqual(0)
    const value = measure().trigger.querySelector('[data-slot="select-value"]')!
    if (width < 768)
      expect(value.scrollWidth).toBeGreaterThan(value.clientWidth)
    expect(measure().iconInside).toBe(true)
  })
})

describe('Select multiple value summary', () => {
  afterAll(() => page.viewport(1920, 1080))

  it('counts the labels that do not fit', async () => {
    await page.viewport(390, 844)
    render(<Bands multiple defaultValue={BANDS.map(([value]) => value)} />)
    await expect.poll(() => measure().shown).toMatch(/ \+\d$/)
    expect(measure().shown).toMatch(/^Bee Gees/)
  })

  it('lists every label when they fit', async () => {
    await page.viewport(1280, 800)
    render(
      <Bands
        multiple
        defaultValue={BANDS.slice(0, 4).map(([value]) => value)}
      />
    )
    await expect
      .poll(() => measure().shown)
      .toBe('Bee Gees, Custard, Powderfinger, Regurgitator')
  })

  it('counts the labels that do not fit right to left', async () => {
    await page.viewport(390, 844)
    const names = ['הלהקה הראשונה', 'הלהקה השנייה', 'הלהקה השלישית', 'הרביעית']
    render(
      <div dir='rtl' style={{ padding: 16 }}>
        <Field>
          <Field.Label>להקות</Field.Label>
          <Select multiple defaultValue={names}>
            <Select.Trigger>
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content>
              {names.map((name) => (
                <Select.Item key={name} value={name}>
                  {name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </Field>
      </div>
    )
    await expect.poll(() => measure().shown).toMatch(/ \+\d$/)
  })

  it('truncates a lone label without counting it', async () => {
    await page.viewport(390, 844)
    render(<Bands multiple defaultValue={['long']} />)
    await expect.poll(() => measure().shown).toBe(BANDS[4][1])
  })

  it('recounts when the labels change width', async () => {
    await page.viewport(1280, 800)
    render(
      <Bands
        multiple
        defaultValue={BANDS.slice(0, 4).map(([value]) => value)}
      />
    )
    await expect.poll(() => measure().shown).not.toMatch(/\+/)
    // Let the observer's first report pass, so only a width change can recount.
    await new Promise((resolve) => setTimeout(resolve, 100))
    measure().trigger.style.letterSpacing = '2em'
    await expect.poll(() => measure().shown).toMatch(/ \+\d$/)
  })

  it('keeps every label in the accessible text', async () => {
    await page.viewport(390, 844)
    render(<Bands multiple defaultValue={BANDS.map(([value]) => value)} />)
    const value = measure().trigger.querySelector('[data-slot="select-value"]')!
    const spoken = value.cloneNode(true) as Element
    spoken.querySelectorAll('[aria-hidden]').forEach((node) => node.remove())
    expect(spoken.textContent).toBe(BANDS.map(([, label]) => label).join(', '))
  })
})
