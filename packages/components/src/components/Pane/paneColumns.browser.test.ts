import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import {
  type PaneLayout,
  REM,
  type RowSpec,
  STACK_INSET,
  TIER_WIDTHS,
  contentMarkup,
  hidingParked,
  modelLayoutAt,
  mount,
  readRow,
  rowMarkup,
  rowShapes,
  useStylesheet
} from './testUtils'
import { paneVariants } from './variants'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())

const near = (a: number, b: number) => Math.abs(a - b) <= 1

function sameLayout(
  actual: PaneLayout | 'hidden',
  expected: PaneLayout | 'hidden'
) {
  if (actual === 'hidden' || expected === 'hidden') return actual === expected
  return (
    near(actual.left, expected.left) &&
    near(actual.width, expected.width) &&
    actual.back === expected.back &&
    actual.close === expected.close &&
    actual.zIndex === expected.zIndex
  )
}

function mirrored(layouts: PaneLayout[], widthPx: number) {
  return layouts.map((layout) => ({
    ...layout,
    left: widthPx - layout.left - layout.width
  }))
}

type Mismatch = {
  shape: string
  width: number
  actual: unknown
  expected: unknown
}

function sweep(
  shapes: { name: string; spec: RowSpec }[],
  { dir = 'ltr', widths = TIER_WIDTHS } = {}
) {
  const mismatches: Mismatch[] = []
  for (const { name, spec } of shapes) {
    for (const width of widths) {
      const content = mount(contentMarkup(rowMarkup(spec)), width, dir)
      const model = modelLayoutAt(spec, width)
      const expected = hidingParked(
        dir === 'rtl' ? mirrored(model, width) : model
      )
      const actual = hidingParked(readRow(content))
      const differs = actual.some(
        (layout, index) => !sameLayout(layout, expected[index]!)
      )
      if (differs) mismatches.push({ shape: name, width, actual, expected })
    }
  }
  return mismatches
}

const familiesOf = (shapes: { name: string; spec: RowSpec }[]) =>
  Map.groupBy(shapes, ({ name }) => name.replace(/ \/ reached \d+/, ''))

describe('every row shape, at every tier and 1px short of it', () => {
  const families = familiesOf(rowShapes())
  it.each([...families.keys()])('%s', (family) => {
    expect(sweep(families.get(family)!).slice(0, 3)).toEqual([])
  })

  it('shows the root pane when nothing is reached', () => {
    const content = mount(
      contentMarkup(
        rowMarkup({ panes: [{ depth: 0 }, { depth: 1 }, { depth: 2 }] })
      ),
      360
    )
    expect(readRow(content).map((pane) => pane.shown)).toEqual([
      true,
      false,
      false
    ])
  })
})

describe('parked panes in a stacked row', () => {
  it('slide a third of the way back and dim behind the top, and wait a gutter clear ahead of it', () => {
    const spec: RowSpec = {
      panes: [
        { depth: 0, reached: true },
        { depth: 1, reached: true },
        { depth: 2 }
      ]
    }
    const content = mount(contentMarkup(rowMarkup(spec)), 600)
    const expected = modelLayoutAt(spec, 600)
    readRow(content).forEach((pane, index) => {
      expect(near(pane.left, expected[index]!.left)).toBe(true)
      expect(pane.opacity).toBe(expected[index]!.opacity)
      expect(pane.zIndex).toBe(expected[index]!.zIndex)
    })
  })
})

describe('right to left, every shape of up to three levels', () => {
  const families = familiesOf(
    rowShapes().filter(
      ({ spec }) => spec.panes.filter((pane) => !pane.overflow).length <= 3
    )
  )
  it.each([...families.keys()])('mirrors %s', (family) => {
    expect(sweep(families.get(family)!, { dir: 'rtl' }).slice(0, 3)).toEqual([])
  })
})

describe('a nested row', () => {
  const outerRows: RowSpec[] = [
    {
      panes: [
        { depth: 0, reached: true },
        { depth: 1, reached: true }
      ]
    },
    { panes: [{ depth: 0, reached: true }], inspector: true }
  ]

  it('lays out by its own shape, beside every outer shape', () => {
    const mismatches: Mismatch[] = []
    const inner = rowShapes(1).filter((_, index) => index % 7 === 0)
    for (const outer of outerRows) {
      for (const { name, spec } of inner) {
        const innerRow = contentMarkup(rowMarkup(spec))
        const host = { ...outer, inner: innerRow }
        for (const width of [360, 1400]) {
          const content = mount(contentMarkup(rowMarkup(host)), width)
          const nested = content.querySelector<HTMLElement>(
            '[data-slot="pane"] [data-slot="navigator-content"]'
          )!
          const innerWidth = Math.round(nested.getBoundingClientRect().width)
          const actual = hidingParked(readRow(nested))
          const expected = hidingParked(modelLayoutAt(spec, innerWidth))
          if (actual.some((layout, i) => !sameLayout(layout, expected[i]!))) {
            mismatches.push({ shape: name, width, actual, expected })
          }
        }
      }
    }
    expect(mismatches.slice(0, 3)).toEqual([])
  })
})

const at = (width: number, spec: RowSpec, dir = 'ltr') =>
  mount(contentMarkup(rowMarkup(spec)), width, dir)

const shownOf = (content: HTMLElement) =>
  readRow(content).map((pane) => pane.shown)

const reachedRow = (reached: boolean[], extra: Partial<RowSpec> = {}) => ({
  panes: reached.map((isReached, depth) => ({ depth, reached: isReached })),
  ...extra
})

const rem = (value: number) => value * REM

describe('the window over a deep row', () => {
  it('drops the left-most pane rather than squeeze a detail in the middle', () => {
    const row = reachedRow([false, false, true])
    expect(shownOf(at(rem(55.25) - 1, row))).toEqual([false, false, true])
    expect(shownOf(at(rem(55.25), row))).toEqual([false, true, true])
    expect(shownOf(at(rem(76) - 1, row))).toEqual([false, true, true])
    expect(shownOf(at(rem(76), row))).toEqual([true, true, true])
  })

  it('keeps an open More as the root of a row with no list', () => {
    const row: RowSpec = {
      reveal: true,
      overflow: true,
      panes: [
        { depth: 1, reached: true },
        { depth: 0, reached: true, overflow: true }
      ]
    }
    expect(shownOf(at(rem(46.25) - 1, row))).toEqual([false, true])
    const [detail, more] = readRow(at(rem(46.25), row))
    expect([detail!.shown, more!.shown]).toEqual([true, true])
    expect(more!.left).toBeLessThan(detail!.left)
  })

  it.each([
    [1240, 2, [384]],
    [1360, 2, [384]],
    [920, 3, [undefined, 400]],
    [1120, 3, [undefined, 448]],
    [1360, 3, [340, 435]],
    [1200, 3, [undefined, 480]],
    [1360, 4, [undefined, 432, 432]]
  ])(
    'gives the parents their track at %ipx of content, %i levels',
    (width, levels, tracks) => {
      const reached = Array.from(
        { length: levels },
        (_, depth) => depth === levels - 1
      )
      const panes = readRow(at(width, reachedRow(reached)))
      tracks.forEach((track, depth) => {
        if (track === undefined) return
        expect(near(panes[depth]!.width, track), `depth ${depth}`).toBe(true)
      })
    }
  )
})

describe('a pane past depth 3', () => {
  const deepRow = (reached: 'deep' | 3, extra: Partial<RowSpec> = {}) => ({
    panes: [
      ...[0, 1, 2, 3].map((depth) => ({ depth, reached: reached === depth })),
      { depth: 'deep' as const, reached: reached === 'deep' }
    ],
    ...extra
  })

  it.each([600, 1400])(
    'covers the row once reached, drawing Back and never Close, at %ipx',
    (width) => {
      const content = at(width, deepRow('deep'))
      const deep = readRow(content)[4]!
      expect(deep).toMatchObject({ shown: true, back: true, close: false })
      expect(deep.zIndex).toBe('3')
      expect(near(deep.left, STACK_INSET)).toBe(true)
      expect(near(deep.width, width - 2 * STACK_INSET)).toBe(true)
    }
  )

  it('stays parked until reached, and while the root is revealed', () => {
    expect(readRow(at(600, deepRow(3)))[4]!.shown).toBe(false)
    expect(readRow(at(600, deepRow('deep', { reveal: true })))[4]!.shown).toBe(
      false
    )
  })
})

describe('an inspector', () => {
  const inspectorRow = (levels: number) =>
    reachedRow(
      Array.from({ length: levels }, (_, depth) => depth === levels - 1),
      { inspector: true }
    )

  it.each([1, 2, 3, 4])(
    'never squeezes the fill below its minimum, %i levels',
    (levels) => {
      let shownAt = 0
      for (let width = 600; width <= 1800; width += 4) {
        const panes = readRow(at(width, inspectorRow(levels)))
        const inspector = panes.at(-1)!
        if (!inspector.shown) continue
        shownAt += 1
        const fill = panes.at(-2)!
        expect(fill.width, `${width}px`).toBeGreaterThanOrEqual(rem(28) - 1)
      }
      expect(shownAt).toBeGreaterThan(0)
    }
  )

  it('hides past a display utility, and in a row with no stack pane', () => {
    const content = at(rem(69), {
      ...inspectorRow(2),
      panes: [...inspectorRow(2).panes, { depth: 0, overflow: true }]
    })
    const inspector = content.querySelector<HTMLElement>(
      '[data-column="inspector"]'
    )!
    const more = content.querySelector<HTMLElement>('[data-overflow]')!
    inspector.classList.add('grid')
    more.classList.add('grid')
    expect(getComputedStyle(inspector).display).toBe('grid')
    expect(getComputedStyle(more).display).toBe('none')
    content.style.width = `${rem(69) - 1}px`
    expect(getComputedStyle(inspector).display).toBe('none')

    const empty = at(2000, { panes: [], inspector: true })
    expect(
      getComputedStyle(empty.querySelector('[data-column="inspector"]')!)
        .display
    ).toBe('none')
  })

  it('tells the row it sits in that the inspector yielded', () => {
    const trigger =
      '<button id="trigger" class="pane-inspector-yielded:inline-flex hidden"></button>'
    const yielded = () =>
      getComputedStyle(document.getElementById('trigger')!).display !== 'none'

    const three = inspectorRow(3)
    let content = at(rem(99.75) - 1, { ...three, inner: trigger })
    expect(yielded()).toBe(true)
    content.style.width = `${rem(99.75)}px`
    expect(yielded()).toBe(false)

    const inner = contentMarkup(rowMarkup({ ...inspectorRow(2), level: 1 }))
    content = at(rem(120), { ...three, inner })
    const nestedRow = content.querySelector('[data-level="1"]')!
    nestedRow
      .querySelector('[data-slot="pane"]')!
      .insertAdjacentHTML('beforeend', trigger)
    const nested = nestedRow.parentElement!
    nested.style.width = `${rem(69) - 1}px`
    expect(yielded()).toBe(true)
    nested.style.width = `${rem(69)}px`
    expect(yielded()).toBe(false)
  })
})

describe('More', () => {
  const nested = (outer: Partial<RowSpec>, inner: Partial<RowSpec>) => {
    const innerRow = contentMarkup(
      rowMarkup({
        level: 1,
        panes: [{ depth: 0 }, { depth: 0, overflow: true }],
        ...inner
      })
    )
    return at(rem(120), {
      panes: [{ depth: 0 }, { depth: 0, overflow: true }, { depth: 1 }],
      ...outer
    })
      .querySelector('[data-level="0"] > [data-depth="1"]')!
      .insertAdjacentHTML('beforeend', innerRow)
  }
  const displayOf = (selector: string) =>
    getComputedStyle(document.querySelector(selector)!).display !== 'none'
  const states = () => [
    displayOf('[data-level="0"] > [data-depth="0"]:not([data-overflow])'),
    displayOf('[data-level="0"] > [data-overflow]'),
    displayOf('[data-level="1"] > [data-depth="0"]:not([data-overflow])'),
    displayOf('[data-level="1"] > [data-overflow]')
  ]

  it("keeps an outer More's state out of a nested row", () => {
    nested({ overflow: true, reveal: true }, {})
    expect(states()).toEqual([false, true, true, false])
    nested({}, { overflow: true, reveal: true })
    expect(states()).toEqual([true, false, false, true])
  })
})

const frames = (count = 2) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

type Motion = { name: string; duration: number }

const motionOf = (element: Element): Motion[] =>
  element
    .getAnimations()
    .map((animation) => ({
      name:
        animation instanceof CSSTransition
          ? animation.transitionProperty
          : animation instanceof CSSAnimation
            ? animation.animationName
            : '',
      duration: Number(animation.effect?.getComputedTiming().duration ?? 0)
    }))
    .filter(({ duration }) => duration > 1)
    .sort((a, b) => a.name.localeCompare(b.name))

const namesOf = (element: Element) => motionOf(element).map(({ name }) => name)

const rowOf = (content: HTMLElement) =>
  content.querySelector<HTMLElement>('[data-slot="navigator-panes"]')!

const paneAt = (content: HTMLElement, depth: number | 'deep') =>
  content.querySelector<HTMLElement>(
    `:scope > [data-slot="navigator-panes"] > [data-depth="${depth}"]`
  )!

describe('push motion', () => {
  afterEach(() => commands.reduceMotion(false))

  const push = async (width: number, pushing: boolean) => {
    const content = at(width, reachedRow([true, false]))
    await frames()
    if (pushing) rowOf(content).setAttribute('data-pushing', '')
    paneAt(content, 1).setAttribute('data-reached', '')
    return content
  }

  it('slides the new top in over its parent while the row pushes', async () => {
    const content = await push(600, true)
    expect(namesOf(paneAt(content, 1))).toEqual(['translate', 'z-index'])
    expect(namesOf(paneAt(content, 0))).toEqual([
      'opacity',
      'translate',
      'visibility',
      'z-index'
    ])
  })

  it('lifts a landing pane over the cover at the end and drops a leaving pane at once', async () => {
    const content = await push(600, true)
    const landing = paneAt(content, 1)
    const leaving = paneAt(content, 0)
    const zOf = (element: HTMLElement) => {
      const [transition] = element
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSTransition &&
            animation.transitionProperty === 'z-index'
        )
      transition!.pause()
      transition!.currentTime = 1
      return getComputedStyle(element).zIndex
    }
    expect(zOf(landing)).toBe('0')
    expect(zOf(leaving)).toBe('0')
    expect(getComputedStyle(landing).transitionTimingFunction).toContain(
      'steps(1)'
    )
  })

  it('jumps without the push, with reduced motion, and in columns', async () => {
    expect(namesOf(paneAt(await push(600, false), 1))).toEqual([])
    expect(namesOf(paneAt(await push(1400, true), 1))).toEqual([])
    await commands.reduceMotion(true)
    expect(namesOf(paneAt(await push(600, true), 1))).toEqual([])
  })

  it('slides only the row that pushes', async () => {
    const inner = contentMarkup(
      rowMarkup({ ...reachedRow([true, false]), level: 1 })
    )
    const content = at(600, { ...reachedRow([true]), inner })
    await frames()
    const innerRow = content.querySelector<HTMLElement>('[data-level="1"]')!
    rowOf(content).setAttribute('data-pushing', '')
    innerRow.querySelector('[data-depth="1"]')!.setAttribute('data-reached', '')
    expect(namesOf(innerRow.querySelector('[data-depth="1"]')!)).toEqual([])

    rowOf(content).removeAttribute('data-pushing')
    innerRow.setAttribute('data-pushing', '')
    innerRow.querySelector('[data-depth="1"]')!.removeAttribute('data-reached')
    await frames()
    innerRow.querySelector('[data-depth="1"]')!.setAttribute('data-reached', '')
    expect(namesOf(innerRow.querySelector('[data-depth="1"]')!)).toContain(
      'translate'
    )
  })

  it('slides a pane past depth 3 in like a push, and only while pushing', async () => {
    for (const pushing of [true, false]) {
      const content = at(600, reachedRow([true, true, true, true]))
      content
        .querySelector('[data-slot="navigator-panes"]')!
        .insertAdjacentHTML(
          'beforeend',
          '<section data-slot="pane" data-column="detail" data-stack data-level="0" data-depth="deep"></section>'
        )
      await frames()
      if (pushing) rowOf(content).setAttribute('data-pushing', '')
      paneAt(content, 'deep').setAttribute('data-reached', '')
      expect(namesOf(paneAt(content, 'deep')).includes('translate')).toBe(
        pushing
      )
    }
  })
})

describe('a pane that mounts as the top', () => {
  afterEach(() => commands.reduceMotion(false))

  const mountTop = async (width: number, pushing: boolean, depth = 1) => {
    const content = at(width, reachedRow([true], {}))
    await frames()
    if (pushing) rowOf(content).setAttribute('data-pushing', '')
    rowOf(content).insertAdjacentHTML(
      'beforeend',
      `<section data-slot="pane" data-column="detail" data-stack data-level="0" data-depth="${depth}" data-reached></section>`
    )
    return paneAt(content, depth)
  }

  it('starts ahead and slides in, only stacked, pushing and with motion allowed', async () => {
    expect(namesOf(await mountTop(600, true))).toContain('translate')
    expect(namesOf(await mountTop(600, false))).toEqual([])
    expect(namesOf(await mountTop(1400, true))).toEqual([])
    await commands.reduceMotion(true)
    expect(namesOf(await mountTop(600, true))).toEqual([])
  })

  it('never slides in as the root it arrives with', async () => {
    document.body.innerHTML = ''
    const content = at(600, { panes: [] })
    await frames()
    rowOf(content).setAttribute('data-pushing', '')
    rowOf(content).insertAdjacentHTML(
      'beforeend',
      '<section data-slot="pane" data-column="list" data-stack data-level="0" data-depth="0" data-reached></section>'
    )
    expect(namesOf(paneAt(content, 0))).toEqual([])
  })
})

describe('a page step', () => {
  afterEach(() => commands.reduceMotion(false))

  const step = (
    kind: 'push' | 'pop' | null,
    width = 600,
    level = 0,
    dir = 'ltr'
  ) => {
    const spec: RowSpec = { ...reachedRow([false, true]), level }
    const panes = rowMarkup(spec)
    const markup = `${panes.slice(0, -'</div>'.length)}<div data-slot="navigator-page-ghost"></div></div>`
    const html = contentMarkup(
      markup
        .replace(
          /(data-depth="1" data-reached)/,
          '$1 data-stack-position="top"'
        )
        .replace(/(data-depth="0")/, '$1 data-stack-position="behind"')
    )
    const content =
      level === 0
        ? mount(html, width, dir)
        : at(width, {
            ...reachedRow([true]),
            inner: html
          }).querySelector<HTMLElement>(
            '[data-slot="pane"] [data-slot="navigator-content"]'
          )!
    const row = rowOf(content)
    if (kind) row.setAttribute('data-page-step', kind)
    return {
      top: row.querySelector('[data-stack-position="top"]')!,
      behind: row.querySelector('[data-stack-position="behind"]')!,
      ghost: row.querySelector<HTMLElement>(
        '[data-slot="navigator-page-ghost"]'
      )!
    }
  }

  it.each([0, 1])(
    'pushes the top pane in over the ghost and pops it back from under, level %i',
    (level) => {
      let row = step('push', 600, level)
      expect(namesOf(row.top)).toEqual(['navigator-page-enter'])
      expect(namesOf(row.ghost)).toEqual(['navigator-page-behind'])
      expect(namesOf(row.behind)).toEqual([])

      row = step('pop', 600, level)
      expect(namesOf(row.top)).toEqual(['navigator-page-return'])
      expect(namesOf(row.ghost)).toEqual(['navigator-page-leave'])
      expect(getComputedStyle(row.ghost).zIndex).toBe('3')

      row = step(null, 600, level)
      expect(namesOf(row.top)).toEqual([])
      expect(namesOf(row.ghost)).toEqual([])
    }
  )

  it('stops where the last row to take two columns starts them, and with reduced motion', async () => {
    expect(namesOf(step('push', rem(55.25) - 1).top)).toEqual([
      'navigator-page-enter'
    ])
    expect(namesOf(step('push', rem(55.25)).top)).toEqual([])
    await commands.reduceMotion(true)
    expect(namesOf(step('push').top)).toEqual([])
  })

  it('slides with the reading direction, and picks up a reversed step', () => {
    const ghostShiftAt = (
      moment: 'start' | 'end',
      dir: string,
      from?: string
    ) => {
      const { ghost } = step('push', 600, 0, dir)
      if (from)
        ghost.parentElement!.style.setProperty('--page-step-ghost-from', from)
      const [animation] = ghost.getAnimations()
      animation!.pause()
      animation!.currentTime =
        moment === 'start'
          ? 0
          : Number(animation!.effect!.getComputedTiming().duration)
      const row = ghost.parentElement!.getBoundingClientRect()
      return Math.round(
        ghost.getBoundingClientRect().left - row.left - STACK_INSET
      )
    }
    expect(ghostShiftAt('end', 'ltr')).toBeLessThan(0)
    expect(ghostShiftAt('end', 'rtl')).toBeGreaterThan(0)
    expect(ghostShiftAt('start', 'ltr', '37px 0px')).toBe(37)
  })
})

describe('beside a vertical primary', () => {
  const navigator = (orientation: string | null, content: string) =>
    `<div data-slot="navigator">${orientation ? `<nav data-slot="navigator-primary" data-orientation="${orientation}"></nav>` : ''}${content}</div>`

  const nest = (outer: string | null, inner: string | null, width: number) => {
    const innerNavigator = navigator(
      inner,
      contentMarkup(rowMarkup({ ...reachedRow([true, false]), level: 1 }))
    )
    const markup = navigator(
      outer,
      contentMarkup(
        rowMarkup({ ...reachedRow([true, false]), inner: innerNavigator })
      )
    )
    document.body.innerHTML = `<div style="width: ${width}px">${markup}</div>`
    const [outerContent, innerContent] = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="navigator-content"]')
    )
    return { outer: outerContent!, inner: innerContent! }
  }

  const gutterOf = (content: HTMLElement) => {
    const style = getComputedStyle(content)
    const cover = getComputedStyle(content, '::before')
    return {
      margin: style.marginInlineStart,
      padding: style.paddingInlineStart,
      cover: cover.content === 'none' ? null : `${cover.width} z${cover.zIndex}`
    }
  }
  const stackStartOf = (content: HTMLElement) => {
    const row = rowOf(content)
    const top = row.querySelector<HTMLElement>(':scope > [data-depth="0"]')!
    return Math.round(
      top.getBoundingClientRect().left - row.getBoundingClientRect().left
    )
  }

  it("widens its own Content's clip into the gutter, under a landed pane", () => {
    let { outer, inner } = nest('vertical', null, 600)
    expect(gutterOf(outer)).toEqual({
      margin: '-8px',
      padding: '8px',
      cover: '8px z1'
    })
    expect(gutterOf(inner)).toEqual({
      margin: '0px',
      padding: '0px',
      cover: null
    })
    expect(Number(getComputedStyle(paneAt(outer, 0)).zIndex)).toBeGreaterThan(1)

    ;({ outer, inner } = nest('horizontal', 'vertical', 600))
    expect(gutterOf(outer).cover).toBeNull()
    expect(gutterOf(inner).cover).toBe('8px z1')

    ;({ outer } = nest(null, null, 600))
    expect(gutterOf(outer).cover).toBeNull()
  })

  it('keeps a flush start edge to its own row', () => {
    for (const inner of [null, 'horizontal']) {
      const rows = nest('vertical', inner, 600)
      expect(stackStartOf(rows.outer)).toBe(0)
      expect(stackStartOf(rows.inner), String(inner)).toBe(STACK_INSET)
    }
    const rows = nest('horizontal', 'vertical', 600)
    expect(stackStartOf(rows.outer)).toBe(STACK_INSET)
    expect(stackStartOf(rows.inner)).toBe(0)
  })

  it('drops the start padding of its own row once columns fit', () => {
    let rows = nest('vertical', 'horizontal', 1600)
    expect(getComputedStyle(rowOf(rows.outer)).paddingInlineStart).toBe('0px')
    rows.inner.style.width = `${rem(46.25)}px`
    expect(getComputedStyle(rowOf(rows.inner)).paddingInlineStart).toBe('12px')

    rows = nest('horizontal', 'vertical', 1600)
    expect(getComputedStyle(rowOf(rows.outer)).paddingInlineStart).toBe('12px')
    rows.inner.style.width = `${rem(46.25)}px`
    expect(getComputedStyle(rowOf(rows.inner)).paddingInlineStart).toBe('0px')
  })
})

describe('reading direction', () => {
  it('parks panes by the direction of their own row', () => {
    const inner = contentMarkup(
      rowMarkup({ ...reachedRow([true, true]), level: 1 })
    )
    const content = at(600, { ...reachedRow([true, true]), inner }, 'rtl')
    const innerContent = content.querySelector<HTMLElement>(
      '[data-slot="pane"] [data-slot="navigator-content"]'
    )!
    innerContent.parentElement!.setAttribute('dir', 'ltr')
    const shiftOf = (row: HTMLElement) => {
      const behind = row.querySelector<HTMLElement>(
        ':scope > [data-depth="0"]'
      )!
      const top = row.querySelector<HTMLElement>(':scope > [data-depth="1"]')!
      return (
        behind.getBoundingClientRect().left - top.getBoundingClientRect().left
      )
    }
    expect(shiftOf(rowOf(content))).toBeGreaterThan(0)
    expect(shiftOf(rowOf(innerContent))).toBeLessThan(0)
  })
})

describe('panes without stack attributes', () => {
  it('keep their own layout and chrome', () => {
    const plain = `<section data-slot="pane" data-column="detail" class="${paneVariants()}"><div data-slot="pane-back"></div><div data-slot="pane-close"></div></section>`
    const content = mount(contentMarkup(plain), 600)
    const pane = content.querySelector<HTMLElement>('[data-slot="pane"]')!
    expect(getComputedStyle(pane).position).toBe('relative')
    expect(getComputedStyle(pane).visibility).toBe('visible')
    for (const slot of ['pane-back', 'pane-close']) {
      expect(
        getComputedStyle(pane.querySelector(`[data-slot="${slot}"]`)!).display
      ).toBe('block')
    }
  })
})
