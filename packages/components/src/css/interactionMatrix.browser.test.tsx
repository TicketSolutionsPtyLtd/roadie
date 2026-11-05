import type { ReactElement } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Button } from '../components/Button'
import { IconButton } from '../components/Button/IconButton'
import { Card } from '../components/Card'
import { Link } from '../components/Link'
import { List } from '../components/List'
import { Menu } from '../components/Menu'
import { useStylesheet } from '../components/Pane/testUtils'
import { Tabs } from '../components/Tabs'
import { Toggle } from '../components/Toggle'
import { ToggleGroup } from '../components/ToggleGroup'
import { pointAt } from '../utils/pointerTestUtils'
import { type RoadieIntent, intentVariants } from '../variants'
import {
  apcaLc,
  flatten,
  minimumLc,
  over,
  shownFill
} from './contrastTestUtils'
import { focusAfterKey, focusRing } from './testUtils'

// One matrix over every interactive component and emphasis, since hover,
// focus and contrast all come from the same utilities and presets.

const STILL = '*, *::before, *::after { transition: none !important }'
const MODES = ['light', 'dark'] as const
const INTENTS = Object.keys(intentVariants) as RoadieIntent[]

type Mode = (typeof MODES)[number]

type Case = {
  name: string
  /** Takes the intent for a part that portals out of the intent wrapper. */
  render: (intent: RoadieIntent) => ReactElement
  target: () => Promise<HTMLElement>
  /** Menu rows show keyboard focus as their highlight fill, not a ring. */
  focus?: 'ring' | 'fill'
  /** Moves keyboard focus to the target, where it can't be focused directly. */
  focusByKeys?: () => Promise<void>
  /**
   * A control shows hover in its fill, as a text colour alone doesn't read as
   * hover. A text link may show it in its underline or tint instead.
   */
  hover?: 'fill' | 'link'
  /** Body text holds Lc 75; a control's label holds Lc 60. */
  text?: 'label' | 'body text'
}

const icon = <svg aria-hidden className='size-4' viewBox='0 0 16 16' />

const button = (name: string) => async () =>
  screen.getByRole('button', { name })

const BUTTON_EMPHASES = ['strong', 'normal', 'subtle', 'subtler'] as const
const TOGGLE_EMPHASES = ['normal', 'subtle', 'subtler'] as const
const TABS_EMPHASES = ['strong', 'normal', 'subtle', 'subtler'] as const
const LINK_EMPHASES = ['normal', 'strong', 'subtle'] as const
const LIST_EMPHASES = ['subtler', 'subtle', 'normal'] as const
const CARD_EMPHASES = ['raised', 'subtle', 'subtler', 'normal'] as const

const CASES: Case[] = [
  ...BUTTON_EMPHASES.map((emphasis) => ({
    name: `Button at ${emphasis}`,
    render: () => <Button emphasis={emphasis}>Buy tickets</Button>,
    target: button('Buy tickets')
  })),
  ...BUTTON_EMPHASES.map((emphasis) => ({
    name: `IconButton at ${emphasis}`,
    render: () => (
      <IconButton emphasis={emphasis} aria-label='Share'>
        {icon}
      </IconButton>
    ),
    target: button('Share')
  })),
  ...TOGGLE_EMPHASES.map((emphasis) => ({
    name: `Toggle at ${emphasis}`,
    render: () => <Toggle emphasis={emphasis}>Favourite</Toggle>,
    target: button('Favourite')
  })),
  ...TOGGLE_EMPHASES.map((emphasis) => ({
    name: `ToggleGroup item at ${emphasis}`,
    render: () => (
      <ToggleGroup emphasis={emphasis} defaultValue={['list']}>
        <ToggleGroup.Item value='list'>List</ToggleGroup.Item>
        <ToggleGroup.Item value='grid'>Grid</ToggleGroup.Item>
      </ToggleGroup>
    ),
    target: button('Grid'),
    // Roving focus sends a direct focus to the pressed item, so arrow across.
    focusByKeys: async () => {
      await focusAfterKey(screen.getByRole('button', { name: 'List' }))
      await userEvent.keyboard('{ArrowRight}')
    }
  })),
  ...TABS_EMPHASES.map((emphasis) => ({
    name: `inactive Tabs tab at ${emphasis}`,
    render: () => (
      <Tabs emphasis={emphasis} defaultValue='lineup'>
        <Tabs.List>
          <Tabs.Tab value='lineup'>Lineup</Tabs.Tab>
          <Tabs.Tab value='venue'>Venue</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    ),
    target: async () => screen.getByRole('tab', { name: 'Venue' })
  })),
  ...LINK_EMPHASES.map((emphasis) => ({
    name: `Link at ${emphasis}`,
    render: () => (
      <p>
        <Link emphasis={emphasis} href='#lineup'>
          See the lineup
        </Link>
      </p>
    ),
    target: async () => screen.getByRole('link', { name: 'See the lineup' }),
    hover: 'link' as const,
    text: 'body text' as const
  })),
  {
    name: 'Menu item',
    render: (intent) => (
      <Menu defaultOpen>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item intent={intent}>Edit event</Menu.Item>
          <Menu.Item intent={intent}>Duplicate</Menu.Item>
        </Menu.Content>
      </Menu>
    ),
    target: () => screen.findByRole('menuitem', { name: 'Duplicate' }),
    focus: 'fill'
  },
  ...LIST_EMPHASES.flatMap((emphasis) =>
    [false, true].map((contained) => ({
      name: `List.Item with href at ${emphasis}${contained ? ', contained' : ''}`,
      render: () => (
        <List emphasis={emphasis} contained={contained}>
          <List.Item title='Shows' href='#shows' />
          <List.Item title='Orders' href='#orders' />
        </List>
      ),
      target: async () => screen.getByRole('link', { name: 'Orders' })
    }))
  ),
  ...CARD_EMPHASES.map((emphasis) => ({
    name: `Card with href at ${emphasis}`,
    render: () => (
      <Card emphasis={emphasis} href='#weekly-pass'>
        <Card.Content>
          <Card.Title>Weekly Pass</Card.Title>
        </Card.Content>
      </Card>
    ),
    target: async () => screen.getByRole('link', { name: 'Weekly Pass' }),
    text: 'body text' as const
  }))
]

type KnownFailure = { mode: Mode; case: string; why: string; ticket: string }

// Run as expected failures, so each one flags itself once it's fixed.
const HOVER_TICKET = 'INNO-TICKET'
const DARK_NORMAL =
  'dark normal rests on step 2 and hovers to --intent-2, also step 2, so only the lift changes'
const RAISED_LIFT = 'raised hovers by its shadow and rise alone'
const KNOWN_HOVER_FAILURES: KnownFailure[] = [
  ...[
    'Button at normal',
    'IconButton at normal',
    'Toggle at normal',
    'List.Item with href at normal',
    'Card with href at normal'
  ].map((name) => ({
    mode: 'dark' as const,
    case: name,
    why: DARK_NORMAL,
    ticket: HOVER_TICKET
  })),
  ...MODES.map((mode) => ({
    mode,
    case: 'Card with href at raised',
    why: RAISED_LIFT,
    ticket: HOVER_TICKET
  }))
]

const knownHoverFailure = (mode: Mode, name: string) =>
  KNOWN_HOVER_FAILURES.find(
    (known) => known.mode === mode && known.case === name
  )

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
beforeEach(() => commands.parkPointer())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

function setMode(mode: Mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

function renderIn(intent: RoadieIntent, testCase: Case) {
  return render(
    <div className={intentVariants[intent]}>{testCase.render(intent)}</div>
  )
}

// A title or label span can set its own colour, apart from the target's.
function textOf(target: HTMLElement) {
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent?.trim() && node.parentElement)
      return node.parentElement
  }
  return target
}

// What a user sees change: the fill over the page, the text, the edge and
// the underline.
function paint(element: HTMLElement) {
  const style = getComputedStyle(element)
  return {
    fill: shownFill(element).join(' '),
    text: flatten(style.color).join(' '),
    border: style.borderTopColor,
    underline: style.textDecorationColor,
    image: style.backgroundImage,
    size: style.backgroundSize
  }
}

describe.each(MODES)('%s mode', (mode) => {
  describe.each(CASES)('$name', (testCase) => {
    const known = knownHoverFailure(mode, testCase.name)
    const hoverTest = known ? it.fails : it
    const hoverName = known
      ? `shows a hover state, known to fail as ${known.why} (${known.ticket})`
      : 'shows a hover state'

    hoverTest(hoverName, async () => {
      setMode(mode)
      renderIn('neutral', testCase)
      const target = await testCase.target()
      const rest = paint(target)

      await pointAt(target)

      if (testCase.hover === 'link')
        await expect.poll(() => paint(target)).not.toEqual(rest)
      else await expect.poll(() => paint(target).fill).not.toBe(rest.fill)
    })

    it('shows keyboard focus', async () => {
      setMode(mode)
      renderIn('neutral', testCase)
      const target = await testCase.target()
      const rest = paint(target)
      await commands.focusPage()
      await expect.poll(() => document.hasFocus()).toBe(true)

      if (testCase.focusByKeys) await testCase.focusByKeys()
      else await focusAfterKey(target)
      await expect.poll(() => target.matches(':focus-visible')).toBe(true)

      if (testCase.focus === 'fill') {
        await expect.poll(() => paint(target).fill).not.toBe(rest.fill)
        return
      }
      const ring = focusRing(target)
      const around = shownFill(target.parentElement!)
      expect(ring.style).not.toBe('none')
      expect(parseFloat(ring.width)).toBeGreaterThanOrEqual(2)
      expect(over(around, ring.color)).not.toEqual(around)
    })

    it.each(INTENTS)('reads at rest in intent-%s', async (intent) => {
      setMode(mode)
      renderIn(intent, testCase)
      const text = textOf(await testCase.target())

      const lc = apcaLc(flatten(getComputedStyle(text).color), shownFill(text))

      expect(Math.abs(lc)).toBeGreaterThanOrEqual(
        minimumLc[testCase.text ?? 'label']
      )
    })
  })
})
