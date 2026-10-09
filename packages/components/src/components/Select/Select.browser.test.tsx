import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Select } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { Field } from '../Field'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'

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

async function nudgeFrames() {
  await userEvent.hover(document.body)
  await new Promise(requestAnimationFrame)
  await new Promise(requestAnimationFrame)
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

  it('makes room for the count it shows, not the largest one', async () => {
    await page.viewport(1280, 800)
    const bands = Array.from({ length: 11 }, (_, index) => `Band ${index + 1}`)
    render(
      <div data-testid='sized' style={{ width: 1200 }}>
        <Select multiple defaultValue={bands}>
          <Select.Trigger>
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Content>
            {bands.map((band) => (
              <Select.Item key={band} value={band}>
                {band}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
    )
    await expect.poll(() => measure().shown).not.toMatch(/\+/)
    const value = measure().trigger.querySelector('[data-slot="select-value"]')!
    const ruler = value.querySelector('.invisible')!
    const widths = Array.from(
      ruler.children,
      (part) => (part as HTMLElement).offsetWidth
    )
    const tenLabels = widths.slice(0, 10).reduce((sum, width) => sum + width)
    const probe = document.createElement('span')
    probe.className = 'ps-1'
    probe.textContent = '+1'
    ruler.append(probe)
    const plusOne = probe.offsetWidth
    probe.remove()
    const sized = screen.getByTestId('sized')
    sized.style.width = `${1200 - value.clientWidth + tenLabels + plusOne + 1}px`
    await expect.poll(() => measure().shown).toMatch(/ \+1$/)
  })

  it('recounts when labels change but read the same joined', async () => {
    await page.viewport(1280, 800)
    const items = {
      pop: 'Pop',
      alpha: 'Alpha alpha alpha',
      alphaBeta: 'Alpha alpha alpha\nBeta beta beta',
      betaChi: 'Beta beta beta\nChi',
      chi: 'Chi'
    }
    function Genres({ value }: { value: string[] }) {
      return (
        <div data-testid='sized' style={{ width: 1200 }}>
          <Select multiple items={items} value={value}>
            <Select.Trigger>
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
          </Select>
        </div>
      )
    }
    const wide = ['pop', 'alpha', 'betaChi']
    const narrow = ['pop', 'alphaBeta', 'chi']
    const { rerender } = render(<Genres value={wide} />)
    const value = measure().trigger.querySelector('[data-slot="select-value"]')!
    const parts = Array.from(
      value.querySelector('.invisible')!.children,
      (part) => (part as HTMLElement).offsetWidth
    )
    const twoLabelsAndOne = parts[0]! + parts[1]! + parts[3]!
    screen.getByTestId('sized').style.width =
      `${1200 - value.clientWidth + twoLabelsAndOne + 2}px`
    await nudgeFrames()
    await expect.poll(() => measure().shown).toBe('Pop, Alpha alpha alpha +1')

    rerender(<Genres value={narrow} />)
    await expect.poll(() => measure().shown).toBe('Pop +2')
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
    const errors: string[] = []
    const record = (event: ErrorEvent) => errors.push(event.message)
    window.addEventListener('error', record)
    try {
      await expect.poll(() => measure().shown).not.toMatch(/\+/)
      // Headless WebKit on Linux runs no frames while idle, so observers only
      // report after an input event. The first nudge lets the observer's
      // initial report pass, so only the width change below can recount.
      await nudgeFrames()
      measure().trigger.style.letterSpacing = '2em'
      await nudgeFrames()
      await expect.poll(() => measure().shown).toMatch(/ \+\d$/)
    } finally {
      window.removeEventListener('error', record)
    }
    expect(errors).toEqual([])
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

function Genre({
  emphasis,
  invalid
}: {
  emphasis?: 'normal' | 'subtle' | 'subtler'
  invalid?: boolean
}) {
  return (
    <Field invalid={invalid}>
      <Field.Label>Genre</Field.Label>
      <Select>
        <Select.Trigger emphasis={emphasis}>
          <Select.Value placeholder='Pick a genre' />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value='rock'>Rock</Select.Item>
        </Select.Content>
      </Select>
    </Field>
  )
}

const TRANSPARENT = /rgba\(0, 0, 0, 0\)|transparent/
const trigger = () => screen.getByRole('combobox', { name: 'Genre' })
const style = () => getComputedStyle(trigger())

describe('Select trigger emphasis', () => {
  it.each(['normal', 'subtle', 'subtler'] as const)(
    'casts no shadow at rest with %s',
    (emphasis) => {
      render(<Genre emphasis={emphasis} />)
      expect(style().boxShadow).toBe('none')
    }
  )

  it('draws a normal trigger with a visible border', () => {
    render(<Genre />)
    expect(style().borderTopWidth).toBe('1px')
    expect(style().borderTopColor).not.toMatch(TRANSPARENT)
  })

  it('tints a subtle trigger with no edge', () => {
    render(<Genre emphasis='subtle' />)
    expect(style().backgroundColor).not.toMatch(TRANSPARENT)
    expect(style().borderTopColor).toMatch(TRANSPARENT)
  })

  it('leaves a subtler trigger without a fill or edge at rest', () => {
    render(<Genre emphasis='subtler' />)
    expect(style().backgroundColor).toMatch(TRANSPARENT)
    expect(style().borderTopColor).toMatch(TRANSPARENT)
  })

  it.each(['normal', 'subtle', 'subtler'] as const)(
    'rings a %s trigger the keyboard focuses',
    async (emphasis) => {
      render(<Genre emphasis={emphasis} />)
      await userEvent.tab()
      await expect.poll(() => style().outlineWidth).not.toBe('0px')
    }
  )

  it.each(['normal', 'subtle', 'subtler'] as const)(
    'fills a %s trigger while its list is open',
    async (emphasis) => {
      render(<Genre emphasis={emphasis} />)
      const resting = style().backgroundColor
      await userEvent.click(trigger())
      await screen.findByRole('option', { name: 'Rock' })
      await userEvent.unhover(trigger())
      await expect.poll(() => style().backgroundColor).not.toBe(resting)
    }
  )

  it.each(['normal', 'subtle', 'subtler'] as const)(
    'edges an invalid %s trigger in danger',
    (emphasis) => {
      render(<Genre emphasis={emphasis} />)
      const valid = style().borderTopColor
      cleanup()
      render(<Genre emphasis={emphasis} invalid />)
      expect(style().borderTopColor).not.toMatch(TRANSPARENT)
      expect(style().borderTopColor).not.toBe(valid)
    }
  )
})

describe('Select trigger size', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48]
  ] as const)('stands %s at %ipx', (size, height) => {
    render(
      <Select>
        <Select.Trigger aria-label='Genre' size={size}>
          <Select.Value placeholder='Pick a genre' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(trigger().getBoundingClientRect().height).toBe(height)
  })
})

describe('Select trigger width', () => {
  beforeAll(() => loadBrandFont())

  function Sized({ emphasis }: { emphasis: 'normal' | 'subtler' }) {
    return (
      <div data-testid='box' style={{ width: 400 }}>
        <Select defaultValue='rock'>
          <Select.Trigger aria-label='Genre' emphasis={emphasis}>
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value='rock'>Rock</Select.Item>
          </Select.Content>
        </Select>
      </div>
    )
  }

  it('fills its container at normal', () => {
    render(<Sized emphasis='normal' />)
    expect(trigger().getBoundingClientRect().width).toBe(400)
  })

  it('hugs its value and icon at subtler', async () => {
    render(<Sized emphasis='subtler' />)
    const value = trigger().querySelector('[data-slot="select-value"]')!
    const icon = trigger().querySelector('[data-slot="select-icon"]')!
    await expect.poll(() => value.textContent).toBe('Rock')
    const box = trigger().getBoundingClientRect()
    const { paddingLeft, paddingRight, borderLeftWidth, borderRightWidth } =
      style()
    const gap =
      icon.getBoundingClientRect().left - value.getBoundingClientRect().right
    expect(gap).toBeCloseTo(6, 0)
    expect(box.width).toBeCloseTo(
      value.getBoundingClientRect().width +
        gap +
        icon.getBoundingClientRect().width +
        parseFloat(paddingLeft) +
        parseFloat(paddingRight) +
        parseFloat(borderLeftWidth) +
        parseFloat(borderRightWidth),
      0
    )
  })
})
