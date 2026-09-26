import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { commands } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import { Tabs } from '../components/Tabs'
import { Toggle } from '../components/Toggle'
import { ToggleGroup } from '../components/ToggleGroup'
import type { RoadieIntent } from '../variants'
import { contrast, over, shownFill } from './contrastTestUtils'

// The fill and the icon carry the state together. The fill alone measures
// 1.28:1 at its faintest, well under 3:1, so this pins it just below that.
const SOFT_FILL = 1.2
const TEXT = 4.5
const STRONGER = 1.4
const NON_TEXT = 3

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
  cleanup()
  document.documentElement.classList.remove('dark')
})

const SURFACES = {
  page: 'bg-normal',
  card: 'emphasis-normal'
} as const
type Surface = keyof typeof SURFACES

const Icon = () => <svg className='size-4' viewBox='0 0 16 16' />

function Controls({ size }: { size: 'sm' | 'md' }) {
  return (
    <>
      <Toggle emphasis='subtler' size={size} defaultPressed aria-label='On'>
        <Icon />
      </Toggle>
      <Toggle emphasis='subtler' size={size} aria-label='Off'>
        <Icon />
      </Toggle>
      <ToggleGroup
        emphasis='subtler'
        size={size}
        defaultValue={['chart']}
        aria-label='View'
      >
        <ToggleGroup.Item value='chart' aria-label='Chart'>
          <Icon />
        </ToggleGroup.Item>
        <ToggleGroup.Item value='table' aria-label='Table'>
          <Icon />
        </ToggleGroup.Item>
      </ToggleGroup>
      <ToggleGroup
        emphasis='subtler'
        size={size}
        multiple
        defaultValue={['bold']}
        aria-label='Style'
      >
        <ToggleGroup.Item value='bold' aria-label='Bold'>
          <Icon />
        </ToggleGroup.Item>
        <ToggleGroup.Item value='italic' aria-label='Italic'>
          <Icon />
        </ToggleGroup.Item>
      </ToggleGroup>
      <Tabs defaultValue='chart' size={size} emphasis='subtler'>
        <Tabs.List aria-label='Tabs'>
          <Tabs.Tab value='chart' aria-label='Chart tab'>
            <Icon />
          </Tabs.Tab>
          <Tabs.Tab value='summary'>Summary</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
      </Tabs>
    </>
  )
}

function renderOn(surface: Surface, size: 'sm' | 'md', dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  const { container } = render(
    <div data-surface className={`${SURFACES[surface]} grid gap-4 p-4`}>
      <Controls size={size} />
    </div>
  )
  return shownFill(container.querySelector('[data-surface]')!)
}

const button = (name: string) => screen.getByRole('button', { name })
const pill = () =>
  screen
    .getByRole('group', { name: 'View' })
    .querySelector<HTMLElement>('[data-slot=toggle-group-indicator]')!
const bar = () =>
  document.querySelector<HTMLElement>('[data-slot=tabs-indicator]')!

async function pillReady() {
  await expect.poll(() => pill().hasAttribute('data-ready')).toBe(true)
}

const iconOn = (item: Element, fill: ReturnType<typeof shownFill>) =>
  contrast(over(fill, getComputedStyle(item).color), fill)

// The selected fill sits behind the item: its own for a Toggle, the pill for
// a group item.
function expectSelected({
  fill,
  selected,
  unselected,
  surfaceFill
}: {
  fill: Element
  selected: Element
  unselected: Element
  surfaceFill: ReturnType<typeof shownFill>
}) {
  const selectedFill = shownFill(fill)
  const restFill = shownFill(unselected)
  expect(contrast(selectedFill, surfaceFill)).toBeGreaterThanOrEqual(SOFT_FILL)
  expect(contrast(selectedFill, restFill)).toBeGreaterThanOrEqual(SOFT_FILL)
  expect(iconOn(selected, selectedFill)).toBeGreaterThanOrEqual(TEXT)
  return {
    selectedIcon: iconOn(selected, selectedFill),
    restIcon: iconOn(unselected, restFill)
  }
}

describe.each([
  ['light', false],
  ['dark', true]
] as const)('subtler selected, %s', (_mode, dark) => {
  describe.each(Object.keys(SURFACES) as Surface[])('on the %s', (surface) => {
    it.each(['sm', 'md'] as const)(
      'gives a pressed Toggle a soft fill and a stronger icon at %s',
      (size) => {
        const surfaceFill = renderOn(surface, size, dark)
        const { selectedIcon, restIcon } = expectSelected({
          fill: button('On'),
          selected: button('On'),
          unselected: button('Off'),
          surfaceFill
        })
        expect(restIcon).toBeGreaterThanOrEqual(TEXT)
        expect(selectedIcon).toBeGreaterThanOrEqual(restIcon * STRONGER)
      }
    )

    it.each(['sm', 'md'] as const)(
      'gives the pressed ToggleGroup item a soft fill and a stronger icon at %s',
      async (size) => {
        const surfaceFill = renderOn(surface, size, dark)
        await pillReady()
        const { selectedIcon, restIcon } = expectSelected({
          fill: pill(),
          selected: button('Chart'),
          unselected: button('Table'),
          surfaceFill
        })
        expect(restIcon).toBeGreaterThanOrEqual(TEXT)
        expect(selectedIcon).toBeGreaterThanOrEqual(restIcon * STRONGER)
      }
    )

    it('gives a pressed item in a multiple ToggleGroup a soft fill', () => {
      const surfaceFill = renderOn(surface, 'md', dark)
      const { selectedIcon, restIcon } = expectSelected({
        fill: button('Bold'),
        selected: button('Bold'),
        unselected: button('Italic'),
        surfaceFill
      })
      expect(selectedIcon).toBeGreaterThanOrEqual(restIcon * STRONGER)
    })

    it('underlines the active tab', () => {
      const surfaceFill = renderOn(surface, 'md', dark)
      const active = screen.getByRole('tab', { name: 'Chart tab' })
      const inactive = screen.getByRole('tab', { name: 'Summary' })

      expect(contrast(shownFill(bar()), surfaceFill)).toBeGreaterThanOrEqual(
        NON_TEXT
      )
      expect(
        contrast(shownFill(bar()), shownFill(inactive))
      ).toBeGreaterThanOrEqual(NON_TEXT)
      expect(iconOn(active, shownFill(active))).toBeGreaterThanOrEqual(TEXT)
    })
  })
})

const INTENTS: RoadieIntent[] = [
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]

describe.each([
  ['light', false],
  ['dark', true]
] as const)('a subtler selected fill in each intent, %s', (_mode, dark) => {
  it.each(INTENTS)(
    'stays apart from the surface in an intent-%s section',
    async (intent) => {
      document.documentElement.classList.toggle('dark', dark)
      const { container } = render(
        <div data-surface className={`emphasis-normal intent-${intent} p-4`}>
          <Controls size='md' />
        </div>
      )
      const surfaceFill = shownFill(container.querySelector('[data-surface]')!)
      await pillReady()
      for (const [fill, selected, unselected] of [
        [button('On'), button('On'), button('Off')],
        [pill(), button('Chart'), button('Table')],
        [button('Bold'), button('Bold'), button('Italic')]
      ] as const)
        expectSelected({ fill, selected, unselected, surfaceFill })
    }
  )
})

describe('subtler selected under forced colours', () => {
  it('keeps the selected Toggle, ToggleGroup item and tab visible', async (context) => {
    render(
      <div className='grid emphasis-normal gap-4 p-4'>
        <Controls size='md' />
        <span data-probe style={{ background: 'Canvas' }} />
      </div>
    )
    await pillReady()
    await commands.forcedColors(true)
    onTestFinished(() => commands.forcedColors(false))
    if (!matchMedia('(forced-colors: active)').matches) {
      context.skip()
      return
    }
    const canvas = getComputedStyle(
      document.querySelector('[data-probe]')!
    ).backgroundColor
    const edge = (element: Element) => getComputedStyle(element).borderTopColor

    const pairs: [Element, Element][] = [
      [button('On'), button('Off')],
      [pill(), button('Table')],
      [button('Bold'), button('Italic')]
    ]
    for (const [selected, rest] of pairs) {
      expect(getComputedStyle(selected).borderTopStyle).toBe('solid')
      expect(edge(selected)).not.toBe(canvas)
      expect(edge(selected)).not.toBe(edge(rest))
    }
    expect(getComputedStyle(bar()).backgroundColor).not.toBe(canvas)
  })
})
