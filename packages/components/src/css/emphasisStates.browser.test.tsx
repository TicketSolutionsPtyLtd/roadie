import type { ReactElement } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Checkbox } from '../components/Checkbox'
import { useStylesheet } from '../components/Pane/testUtils'
import { RadioGroup } from '../components/RadioGroup'
import { Select } from '../components/Select'
import { pointAt } from '../utils/pointerTestUtils'
import { setHoverCapable } from './testUtils'

// Each interactive emphasis's look at rest, on hover, under keyboard focus and
// pressed, read from computed style. An expected fill or shadow names tokens
// (`intent-2` is `var(--intent-2)`, and a space separates shadow layers), a
// literal value, or `.class` for a caller's utility, resolved on a probe.

const STILL = '*, *::before, *::after { transition: none !important }'

type Move = 'lift' | 'press' | 'none'
type Look = { fill?: string; shadow?: string; border?: string; move?: Move }
type States = { rest: Look; hover: Look; active: Look; isActive?: Look }
type State = 'rest' | 'hover' | 'focus' | 'active' | 'is-active'

function look(fill: string, shadow: string, move: Move) {
  return { fill, shadow, move }
}

const PRESETS: Record<string, States> = {
  strong: {
    rest: look('intent-bg-strong', 'rim-light-subtle', 'none'),
    hover: look('intent-bg-strong-hover', 'rim-light-subtle shadow-sm', 'lift'),
    active: look('intent-bg-strong-active', 'none', 'press')
  },
  normal: {
    rest: look('intent-bg-normal', 'none', 'none'),
    hover: look('intent-2', 'shadow-sm', 'lift'),
    active: look('intent-3', 'none', 'press')
  },
  subtle: {
    rest: look('intent-bg-subtle', 'rim-light-subtler', 'none'),
    hover: look('intent-4a', 'rim-light-subtler', 'none'),
    active: look('intent-5a', 'rim-light-subtler', 'press'),
    // is-interactive presses on :active alone, and subtle draws no press.
    isActive: { move: 'none' }
  },
  subtler: {
    rest: look('transparent', 'none', 'none'),
    hover: look('intent-3a', 'none', 'none'),
    active: look('intent-4a', 'none', 'press'),
    isActive: { move: 'none' }
  },
  raised: {
    rest: look('intent-bg-raised', 'rim-light-strong shadow-md', 'none'),
    hover: look('intent-bg-raised', 'rim-light-strong shadow-lg', 'lift'),
    active: look('intent-bg-raised', 'rim-light-strong shadow-sm', 'press')
  }
}

const lookIn = (states: States, state: State): Look =>
  state === 'focus'
    ? states.hover
    : state === 'is-active'
      ? { ...states.active, ...states.isActive }
      : states[state]

const css = (value: string) =>
  /[()]|^(none|transparent)$/.test(value)
    ? value
    : value.replace(/[\w-]+/g, 'var(--$&)').replaceAll(' ', ', ')

let host: HTMLElement | undefined
withSheet(() => STILL)
beforeAll(() => commands.parkPointer())
afterEach(async () => {
  await commands.pointer([{ type: 'up' }, { type: 'move', x: 0, y: 0 }])
  setHoverCapable(true)
  cleanup()
  host?.remove()
})

function withSheet(sheet: () => Promise<string> | string) {
  let remove = () => {}
  beforeAll(async () => {
    remove = useStylesheet(await sheet())
  })
  afterAll(() => remove())
}

function mount(markup: string) {
  host = document.createElement('div')
  host.style.padding = '24px'
  host.innerHTML = markup
  document.body.append(host)
  const surface = host.firstElementChild as HTMLElement
  return { surface, driver: surface.querySelector('a') ?? surface }
}

async function enter(state: State, driver: HTMLElement, surface: HTMLElement) {
  if (state === 'hover') await pointAt(driver)
  if (state === 'focus') await userEvent.keyboard('{Shift}')
  if (state === 'focus') driver.focus({ focusVisible: true })
  if (state === 'is-active') surface.classList.add('is-active')
  if (state === 'active') {
    driver.scrollIntoView({ block: 'center' })
    const { x, y, width, height } = driver.getBoundingClientRect()
    await commands.pointer([
      { type: 'move', x: x + width / 2, y: y + height / 2 },
      { type: 'down' }
    ])
  }
  await new Promise(requestAnimationFrame)
}

function resolveOn(probe: HTMLElement, property: string, value: string) {
  const utility = value.startsWith('.')
  probe.className = utility ? `block ${value.slice(1)}` : 'block'
  probe.style.cssText = utility ? '' : `${property}: ${css(value)}`
  return getComputedStyle(probe).getPropertyValue(property)
}

const PAINT = [
  ['fill', 'background-color'],
  ['shadow', 'box-shadow'],
  ['border', 'border-top-color']
] as const

function expectLook(element: HTMLElement, expected: Look) {
  const probe = element.appendChild(document.createElement('span'))
  const style = getComputedStyle(element)
  for (const [key, property] of PAINT) {
    const value = expected[key]
    if (value !== undefined)
      expect(style.getPropertyValue(property), key).toBe(
        resolveOn(probe, property, value)
      )
  }
  probe.remove()
  const matrix = new DOMMatrix(style.transform)
  if (expected.move === 'lift') expect([matrix.a, matrix.f]).toEqual([1, -1])
  if (expected.move === 'press') expect(matrix.a).toBeCloseTo(0.99)
  if (expected.move === 'none') expect(matrix.isIdentity).toBe(true)
}

const surfaces = (classes: string) => ({
  'is-interactive': `<button class="${classes} is-interactive h-10 px-4">Buy tickets</button>`,
  'is-interactive-within': `<div class="${classes} is-interactive-within p-4"><a href="#pass" data-interactive-target>Weekly Pass</a></div>`
})

const STATES: State[] = ['rest', 'hover', 'focus', 'active', 'is-active']

const SHEETS = {
  source: () => roadieCss,
  'optimized for production': () => commands.optimizeCss(roadieCss),
  'with nesting lowered': () => commands.lowerNesting(roadieCss)
}

describe.each(Object.entries(SHEETS))('with the %s sheet', (_, sheet) => {
  withSheet(sheet)

  describe.each(Object.entries(PRESETS))('emphasis-%s', (emphasis, states) => {
    describe.each(Object.entries(surfaces(`emphasis-${emphasis}`)))(
      'on %s',
      (utility, markup) => {
        const shown = STATES.filter(
          // is-active marks a pressed is-interactive only.
          (state) => state !== 'is-active' || utility === 'is-interactive'
        )

        it.each(shown)('shows its %s look', async (state) => {
          const { surface, driver } = mount(markup)
          await enter(state, driver, surface)
          expectLook(surface, lookIn(states, state))
        })

        it('keeps its rest look under a tap on a touch screen', async () => {
          setHoverCapable(false)
          const { surface, driver } = mount(markup)
          await enter('hover', driver, surface)
          expect(driver.matches(':hover')).toBe(true)
          expectLook(surface, states.rest)
        })
      }
    )
  })
})

describe('emphasis state values', () => {
  withSheet(() => roadieCss)

  // Internal: each preset hands the shared state rule the looks it paints.
  // One it leaves out stays guaranteed-invalid, so the preset's rest paints.
  const DECLARED: Record<string, string> = {
    strong:
      'fill fill-hover fill-active shadow shadow-hover shadow-active lift',
    normal: 'fill fill-hover fill-active shadow-hover shadow-active lift',
    subtle: 'fill fill-hover fill-active',
    subtler: 'fill fill-interactive fill-hover fill-active',
    raised: 'shadow shadow-hover shadow-active lift'
  }
  const NAMES = ['fill', 'fill-interactive', 'fill-hover', 'fill-active']
  NAMES.push('shadow', 'shadow-hover', 'shadow-active', 'lift')

  it.each(Object.entries(DECLARED))(
    'emphasis-%s declares its own values, which nothing inside inherits',
    (emphasis, declares) => {
      const { rest, hover, active } = PRESETS[emphasis]!
      const value: Record<string, string | undefined> = {
        fill: emphasis === 'subtler' ? 'intent-bg-subtler' : rest.fill,
        'fill-interactive': rest.fill,
        'fill-hover': hover.fill,
        'fill-active': active.fill,
        shadow: rest.shadow,
        'shadow-hover': hover.shadow,
        'shadow-active': active.shadow
      }
      const { surface: element } = mount(
        `<div class="intent-accent emphasis-${emphasis}"><span></span></div>`
      )
      const probe = element.querySelector('span')!
      for (const name of NAMES) {
        const variable = `--emphasis-${name === 'lift' ? 'lift-hover' : name}`
        const declared = getComputedStyle(element).getPropertyValue(variable)
        expect(getComputedStyle(probe).getPropertyValue(variable)).toBe('')
        if (!declares.split(' ').includes(name))
          expect(declared, variable).toBe('')
        else if (name === 'lift') expect(declared).toBe('translateY(-1px)')
        else {
          const property = name.startsWith('fill')
            ? 'background-color'
            : 'box-shadow'
          expect(declared, variable).not.toBe('')
          expect(resolveOn(probe, property, declared), variable).toBe(
            resolveOn(probe, property, value[name]!)
          )
        }
      }
    }
  )
})

describe('around an interactive emphasis', () => {
  withSheet(() => roadieCss)

  it('leaves a resting emphasis inside a hovered one at its own rest', async () => {
    const { surface: button } = mount(
      `<button class="emphasis-normal is-interactive p-4"><span class="block emphasis-subtle p-2">Floor</span></button>`
    )
    await enter('hover', button, button)
    expectLook(button.querySelector('span')!, PRESETS.subtle!.rest)
  })

  // A caller's fill and shadow hold at rest and its border in every state;
  // the emphasis repaints fill and shadow on hover, focus and press.
  const edge = { border: '.border-strong' }
  const CALLER: States = {
    rest: { fill: '.bg-sunken', shadow: '.shadow-lg', ...edge },
    hover: { ...PRESETS.normal!.hover, ...edge },
    active: { ...PRESETS.normal!.active, ...edge }
  }
  describe.each(
    Object.entries(
      surfaces('emphasis-normal bg-sunken border-strong shadow-lg')
    )
  )('a caller’s fill, edge and shadow on %s', (_, markup) => {
    it.each(['rest', 'hover', 'focus', 'active'] as const)(
      'show the %s look',
      async (state) => {
        const { surface, driver } = mount(markup)
        await enter(state, driver, surface)
        expectLook(surface, lookIn(CALLER, state))
      }
    )
  })
})

const CALLERS: [string, ReactElement, string, Look][] = [
  [
    'a checked normal Checkbox',
    <Checkbox emphasis='normal' label='Rock' defaultChecked />,
    'color-accent-2',
    PRESETS.normal!.hover
  ],
  [
    'a checked normal RadioGroup item',
    <RadioGroup emphasis='normal' defaultValue='floor'>
      <RadioGroup.Item value='floor' label='Floor' />
    </RadioGroup>,
    'color-accent-2',
    PRESETS.normal!.hover
  ],
  [
    'an open subtler Select trigger',
    <Select defaultOpen>
      <Select.Trigger emphasis='subtler' aria-label='Genre'>
        <Select.Value placeholder='Pick a genre' />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value='rock'>Rock</Select.Item>
      </Select.Content>
    </Select>,
    'intent-4a',
    PRESETS.subtler!.hover
  ]
]

describe('components that colour an interactive emphasis', () => {
  withSheet(() => roadieCss)

  it.each(CALLERS)(
    '%s shows its own fill at rest and the emphasis’s on hover',
    async (_, element, fill, hover) => {
      render(<div className='p-6'>{element}</div>)
      const surface = document.querySelector<HTMLElement>('.is-interactive')!
      expectLook(surface, { fill })
      await enter('hover', surface, surface)
      expectLook(surface, hover)
    }
  )
})
