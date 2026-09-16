import { describe, expect, it } from 'vitest'

import committedCss from '../../css/pane-columns.css?raw'
import { type PaneEntry, derivePositions } from '../Navigator/paneStack'
import {
  type PaneColumnsRule,
  paneColumnsRulesOf,
  paneRuleAt
} from '../Navigator/testUtils'
import {
  PANE_MAX_COLUMNS,
  PANE_MAX_DEPTH,
  PANE_MAX_LEVELS,
  columnTier,
  inspectorTier,
  paneCell,
  renderPaneColumnsCss,
  rowTier,
  stackedUntil,
  visibleColumns
} from './paneColumns'

const rules = paneColumnsRulesOf(renderPaneColumnsCss())
const stacked = (rule: PaneColumnsRule) =>
  /\[data-depth="\d"\]:not\(\[data-exiting\]\)$/.test(rule.selector) &&
  rule.body.includes('--pane-back') &&
  !rule.conditions.some((condition) => condition.startsWith('@container'))
const columnRules = rules.filter(
  (rule) =>
    rule.body.includes('--pane-back') &&
    rule.conditions.some((condition) => condition.startsWith('@container'))
)

function html(markup: string) {
  document.body.innerHTML = markup
  return (selector: string) =>
    document.querySelector<HTMLElement>(selector) as HTMLElement
}

const hiddenBy = (element: Element) =>
  rules
    .filter((rule) => rule.body === 'display: none !important;')
    .filter((rule) => element.matches(rule.selector))

const stackStates = (levels: number) =>
  [false, true].flatMap((reveal) =>
    Array.from({ length: 2 ** levels }, (_, bits) => ({
      reveal,
      current: Array.from(
        { length: levels },
        (_, depth) => (bits & (1 << depth)) !== 0
      )
    }))
  )

const stackRow = (
  level: number,
  current: boolean[],
  reveal: boolean,
  { base = 0, closedMore = false } = {}
) =>
  `<div data-slot="navigator-panes" data-level="${level}" ${reveal ? 'data-reveal' : ''}>${current
    .map(
      (isCurrent, depth) =>
        `<div data-slot="pane" data-stack data-level="${level}" data-depth="${base + depth}" ${isCurrent ? 'data-current' : ''}></div>`
    )
    .join(
      ''
    )}${closedMore ? `<div data-slot="pane" data-stack data-level="${level}" data-depth="0" data-overflow></div>` : ''}</div>`

const slotOf = (body: string) =>
  body.includes('flex: 1 1 0')
    ? 'fill'
    : body.includes('flex: 0 0 ')
      ? 'parent'
      : body.includes('translate: calc(-33%')
        ? 'behind'
        : body.includes('translate: calc((100%')
          ? 'ahead'
          : 'top'

// Content widths, in rem, that the prototype frames measured at 16px/rem.
const REM = 16
// A row from its root by default; pass its top and levels for any other.
const columnsAt = (px: number, top = 0, levels = PANE_MAX_COLUMNS) =>
  px / REM >= rowTier(3, top, levels)
    ? 3
    : px / REM >= rowTier(2, top, levels)
      ? 2
      : 1

const shown = (columns: number, top: number, levels: number) =>
  Array.from({ length: levels }, (_, depth) =>
    paneCell(columns, top, depth, levels)
  )
    .map((cell, depth) => ({ depth, ...cell }))
    .filter((cell) => cell.slot !== 'behind' && cell.slot !== 'ahead')
    .map(
      (cell) =>
        `${cell.depth}${cell.back ? '[Back]' : ''}${cell.close ? '[Close]' : ''}`
    )
    .join(' | ')

describe('tiers', () => {
  it('fits two columns at 46.25rem beside the root and 55.25rem beside a detail, and three at 76rem, 81rem once the window slides past the root', () => {
    expect(columnTier(1)).toBe(0)
    expect(columnTier(2)).toBe(46.25)
    expect(columnTier(2, [1])).toBe(55.25)
    expect(columnTier(3)).toBe(76)
    expect(columnTier(3, [1, 2])).toBe(81)
    expect(rowTier(3, 2, 3)).toBe(76)
    expect(rowTier(3, 3, 4)).toBe(81)
    expect(rowTier(3, 1, 2)).toBe(46.25)
    expect(rowTier(2, 0, 1)).toBe(46.25)
    expect(rowTier(2, 1, 3)).toBe(46.25)
    expect(rowTier(2, 2, 3)).toBe(55.25)
    expect(rowTier(2, 3, 4)).toBe(55.25)
  })

  it('fits the inspector once every level present fits beside it at its minimum, at any top', () => {
    expect(inspectorTier(1)).toBe(46.25)
    expect(inspectorTier(2)).toBe(69)
    expect(inspectorTier(3)).toBe(99.75)
    expect(inspectorTier(4)).toBe(105.75)
  })
})

describe('paneCell — the prototype evidence', () => {
  it('Tickets → Glamping → Sam, Sam current', () => {
    expect(shown(columnsAt(375, 2, 3), 2, 3)).toBe('2[Back]')
    expect(shown(columnsAt(760, 2, 3), 2, 3)).toBe('2[Back]')
    expect(shown(columnsAt(932, 2, 3), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(1188, 2, 3), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(1348, 2, 3), 2, 3)).toBe('0 | 1 | 2[Close]')
  })

  it('two levels: Close on the detail, no Back', () => {
    expect(shown(columnsAt(375, 1, 2), 1, 2)).toBe('1[Back]')
    expect(shown(columnsAt(760, 1, 2), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(932, 1, 2), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(1188, 1, 2), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(1348, 1, 2), 1, 2)).toBe('0 | 1[Close]')
  })

  it('three levels with the root revealed: Sam parked ahead', () => {
    expect(shown(columnsAt(375, 0, 3), 0, 3)).toBe('0')
    expect(shown(columnsAt(760, 0, 3), 0, 3)).toBe('0 | 1')
    expect(shown(columnsAt(932, 0, 3), 0, 3)).toBe('0 | 1')
    expect(shown(columnsAt(1188, 0, 3), 0, 3)).toBe('0 | 1')
    expect(shown(columnsAt(1348, 0, 3), 0, 3)).toBe('0 | 1 | 2')
    expect(paneCell(2, 0, 2, 3)).toEqual({
      slot: 'ahead',
      back: false,
      close: false
    })
  })

  it('slides the window over four levels', () => {
    expect(shown(3, 3, 4)).toBe('1[Back] | 2 | 3[Close]')
    expect(paneCell(3, 3, 0, 4).slot).toBe('behind')
  })

  it('draws nothing on a middle column or the root', () => {
    expect(paneCell(3, 2, 1, 3)).toEqual({
      slot: 'parent',
      back: false,
      close: false
    })
    expect(paneCell(3, 2, 0, 3)).toEqual({
      slot: 'parent',
      back: false,
      close: false
    })
  })

  it('fills with the right-most visible pane, whatever its role would say', () => {
    expect(paneCell(2, 2, 1, 3).slot).toBe('parent')
    expect(paneCell(2, 2, 2, 3).slot).toBe('fill')
  })
})

describe('agreement with derivePositions, in every current and reveal state', () => {
  it('puts the top where deriveTopIndex does, a current root included', () => {
    for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
      for (const { reveal, current } of stackStates(levels)) {
        const entries = current.map((isCurrent): PaneEntry => ({
          role: 'detail',
          current: isCurrent,
          primaryNav: 'auto'
        }))
        const positions = derivePositions(entries, reveal)
        const top = positions.indexOf('top')
        positions.forEach((position, depth) => {
          expect(paneCell(1, top, depth, levels).slot).toBe(position)
        })
      }
    }
  })

  it('treats a current root as the top of its stack', () => {
    const entries: PaneEntry[] = [
      { role: 'list', current: true, primaryNav: 'auto' },
      { role: 'detail', current: false, primaryNav: 'auto' }
    ]
    expect(derivePositions(entries)).toEqual(['top', 'ahead'])
    expect(paneCell(1, 0, 0, 2).slot).toBe('top')
    expect(paneCell(1, 0, 1, 2).slot).toBe('ahead')
  })
})

describe('the rules a real row matches', () => {
  const PX = 1 / REM
  // Where a row takes `columns` columns, and just short of it, where it keeps one fewer.
  const widthsOf = (columns: number, top: number, levels: number) =>
    columns === 1
      ? [{ at: 0, columns: 1 }]
      : [
          { at: rowTier(columns, top, levels), columns },
          {
            at: rowTier(columns, top, levels) - PX,
            columns: Math.min(columns, Math.max(levels, 2)) - 1
          }
        ]

  const expectCell = (
    pane: Element,
    at: number,
    cell: ReturnType<typeof paneCell>,
    state: string
  ) => {
    const rule = paneRuleAt(rules, pane, at)
    expect(rule, state).toBeDefined()
    expect(slotOf(rule!.body), state).toBe(cell.slot)
    expect(rule!.body, state).toContain(
      `--pane-back: ${cell.back ? 'grid' : 'none'}; --pane-close: ${cell.close ? 'grid' : 'none'};`
    )
  }

  it('lays every stack pane out in the slot paneCell names from its tier, and one column fewer just short of it', () => {
    for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
      for (const { reveal, current } of stackStates(levels)) {
        const $ = html(stackRow(0, current, reveal))
        const top = reveal ? 0 : Math.max(0, current.lastIndexOf(true))
        for (let columns = 1; columns <= PANE_MAX_COLUMNS; columns += 1) {
          for (const width of widthsOf(columns, top, levels)) {
            for (let depth = 0; depth < levels; depth += 1) {
              expectCell(
                $(`[data-depth="${depth}"]`),
                width.at,
                paneCell(width.columns, top, depth, levels),
                `levels ${levels}, reveal ${reveal}, current ${current}, ${width.at}rem, depth ${depth}`
              )
            }
          }
        }
      }
    }
  })

  it('drops the left-most pane rather than squeeze a detail in the middle', () => {
    const $ = html(stackRow(0, [false, false, true], false))
    const shownAt = (at: number) =>
      [0, 1, 2]
        .map((depth) =>
          slotOf(paneRuleAt(rules, $(`[data-depth="${depth}"]`), at)!.body)
        )
        .join(' ')
    expect(shownAt(55.2)).toBe('behind behind top')
    expect(shownAt(55.25)).toBe('behind parent fill')
    expect(shownAt(75.9)).toBe('behind parent fill')
    expect(shownAt(76)).toBe('parent parent fill')
  })

  it('reads a row with nothing at depth 0 one depth shallower, so its first pane is the root', () => {
    for (const closedMore of [false, true]) {
      for (let levels = 1; levels <= 3; levels += 1) {
        for (const { reveal, current } of stackStates(levels)) {
          const $ = html(stackRow(0, current, reveal, { base: 1, closedMore }))
          const top = reveal ? 0 : Math.max(0, current.lastIndexOf(true))
          for (let columns = 1; columns <= PANE_MAX_COLUMNS; columns += 1) {
            for (const width of widthsOf(columns, top, levels)) {
              for (let depth = 0; depth < levels; depth += 1) {
                expectCell(
                  $(`[data-depth="${depth + 1}"]:not([data-overflow])`),
                  width.at,
                  paneCell(width.columns, top, depth, levels),
                  `closed More ${closedMore}, levels ${levels}, reveal ${reveal}, current ${current}, ${width.at}rem, written depth ${depth + 1}`
                )
              }
            }
          }
        }
      }
    }
  })

  it('keeps an open More as the root of a row with no list', () => {
    const $ = html(
      `<div data-slot="navigator-panes" data-level="0" data-reveal data-overflow><div data-slot="pane" data-stack data-level="0" data-depth="1" data-current></div><div data-slot="pane" data-stack data-level="0" data-depth="0" data-overflow data-current></div></div>`
    )
    const more = $('[data-overflow][data-depth="0"]')
    const detail = $('[data-depth="1"]')
    const at = (columns: number, pane: HTMLElement) =>
      slotOf(paneRuleAt(rules, pane, columnTier(columns))!.body)
    expect(at(1, more)).toBe('top')
    expect(at(1, detail)).toBe('ahead')
    expect(at(2, more)).toBe('parent')
    expect(at(2, detail)).toBe('fill')
  })

  it('covers the row with a current pane past depth 3, drawing Back and never Close', () => {
    const matched = (pane: Element) =>
      rules.filter((rule) => pane.matches(rule.selector))
    const shows = (pane: Element) =>
      matched(pane).some((rule) => rule.body.includes('visibility: visible'))

    const deepRow = (current: boolean[], reveal: boolean) =>
      html(
        stackRow(0, current, reveal).replace(
          'data-depth="4"',
          'data-depth="deep"'
        )
      )
    let $ = deepRow([false, false, false, false, true], false)
    const fifth = $('[data-depth="deep"]')
    const own = matched(fifth)
    expect(own.map((rule) => rule.body)).toEqual([
      '--pane-back: none; --pane-close: none; --pane-edge: none;',
      '--pane-back: grid; --pane-edge: grid;',
      'position: absolute !important; inset: var(--pane-stack-inset, 0px); inset-inline-start: var(--pane-stack-inset-start, var(--pane-stack-inset, 0px)); z-index: 3; translate: calc((100% + var(--pane-stack-inset, 0px)) * var(--pane-dir, 1)) 0; visibility: hidden; pointer-events: none; transition-property: translate, visibility; transition-timing-function: var(--ease-enter);',
      'translate: 0 0; visibility: visible; pointer-events: auto;'
    ])
    expect(own.some((rule) => rule.body.includes('--pane-close: grid'))).toBe(
      false
    )
    for (let depth = 0; depth <= PANE_MAX_DEPTH; depth += 1) {
      const pane = $(`[data-depth="${depth}"]`)
      expect(
        matched(pane).filter((rule) =>
          rule.body.startsWith('position: absolute')
        )
      ).toHaveLength(1)
      expect(
        matched(pane).some((rule) => rule.body.includes('z-index: 3'))
      ).toBe(false)
    }

    $ = deepRow([false, false, false, true, false], false)
    expect(shows($('[data-depth="deep"]'))).toBe(false)
    $ = deepRow([false, false, false, false, true], true)
    expect(shows($('[data-depth="deep"]'))).toBe(false)
  })

  it('slides a pane past depth 3 like a push, and only while pushing', () => {
    const slides = (pane: Element) =>
      rules.some(
        (rule) =>
          rule.body.includes('transition-duration') &&
          pane.matches(rule.selector)
      )
    const row = (pushing: boolean) =>
      html(
        stackRow(0, [false, false, false, false, true], false)
          .replace('data-depth="4"', 'data-depth="deep"')
          .replace(
            'data-level="0" ',
            `data-level="0" ${pushing ? 'data-pushing' : ''} `
          )
      )
    expect(slides(row(true)('[data-depth="deep"]'))).toBe(true)
    expect(slides(row(false)('[data-depth="deep"]'))).toBe(false)
  })
})

describe('a page step', () => {
  const animating = rules.filter((rule) => rule.body.includes('animation:'))
  const animationOf = (element: Element) =>
    animating.find((rule) => element.matches(rule.selector))?.body ?? null
  const stepRow = (step?: 'push' | 'pop', level = 0) =>
    html(
      `<div data-slot="navigator-panes" data-level="${level}" ${step ? `data-page-step="${step}"` : ''}><div data-slot="pane" data-stack data-level="${level}" data-depth="0" data-stack-position="behind"></div><div data-slot="pane" data-stack data-level="${level}" data-depth="1" data-current data-stack-position="top"></div><div data-slot="navigator-page-ghost"></div></div>`
    )

  it('slides only a stacked row, and only with motion allowed', () => {
    expect(animating.length).toBeGreaterThan(0)
    for (const rule of animating) {
      expect(rule.conditions).toContain(
        `@container panes (width < ${stackedUntil()}rem)`
      )
      expect(rule.conditions).toContain(
        '@media (prefers-reduced-motion: no-preference)'
      )
    }
  })

  it('pushes the top pane in over the ghost, and pops it back from under', () => {
    for (const level of [0, 1]) {
      let $ = stepRow('push', level)
      expect(animationOf($('[data-stack-position="top"]'))).toContain(
        'navigator-page-enter'
      )
      expect(animationOf($('[data-slot="navigator-page-ghost"]'))).toContain(
        'navigator-page-behind'
      )
      expect(animationOf($('[data-stack-position="behind"]'))).toBeNull()

      $ = stepRow('pop', level)
      expect(animationOf($('[data-stack-position="top"]'))).toContain(
        'navigator-page-return'
      )
      const leave = animationOf($('[data-slot="navigator-page-ghost"]'))
      expect(leave).toContain('navigator-page-leave')
      expect(leave).toContain('z-index: 3')

      $ = stepRow(undefined, level)
      expect(animationOf($('[data-stack-position="top"]'))).toBeNull()
      expect(animationOf($('[data-slot="navigator-page-ghost"]'))).toBeNull()
    }
  })

  it('stops where the last row to take two columns starts them', () => {
    const tiers = rules
      .flatMap((rule) => rule.conditions)
      .map((condition) => condition.match(/\(width >= ([\d.]+)rem\)/)?.[1])
      .filter((width) => width !== undefined)
      .map(Number)
    const twoColumnStarts = Array.from(
      { length: PANE_MAX_DEPTH + 1 },
      (_, index) => index + 1
    ).flatMap((levels) =>
      Array.from({ length: levels }, (_, top) => rowTier(2, top, levels))
    )
    expect(new Set(twoColumnStarts)).toEqual(new Set([46.25, 55.25]))
    expect(Math.min(...tiers)).toBe(columnTier(2))
    expect(tiers).toContain(55.25)
    expect(stackedUntil()).toBe(Math.max(...twoColumnStarts))
  })

  it('slides with the reading direction, and picks up a reversed step', () => {
    const frames = rules.filter((rule) =>
      rule.conditions.some((c) => c.startsWith('@keyframes navigator-page-'))
    )
    const parked = frames.filter((frame) => /calc\(.*%/.test(frame.body))
    expect(parked.length).toBe(4)
    for (const frame of parked) {
      expect(frame.body).toContain('var(--pane-dir, 1)')
    }
    const starts = frames.filter((frame) => frame.selector === 'from')
    expect(
      starts.map((frame) => frame.body.match(/var\((--[\w-]+)/)?.[1])
    ).toEqual([
      '--page-step-pane-from',
      '--page-step-ghost-from',
      '--page-step-pane-from',
      '--page-step-ghost-from'
    ])

    const $ = html(
      '<div dir="rtl"><div data-slot="navigator-panes" data-level="0"><div data-slot="navigator-panes" data-level="1"></div></div></div>'
    )
    const set = (row: Element, property: string) =>
      rules
        .filter((rule) => row.matches(rule.selector))
        .map((rule) => rule.body)
        .join(' ')
        .includes(property)
    for (const level of [0, 1]) {
      const own = $(`[data-level="${level}"]`)
      expect(set(own, '--pane-dir: -1')).toBe(true)
      expect(set(own, '--page-step-ghost-from: initial')).toBe(true)
      expect(set(own, '--page-step-pane-from: initial')).toBe(true)
    }
  })
})

describe('parent tracks follow the columns a row shows', () => {
  // Resolves a generated track at a content width, in px.
  const trackPx = (track: string, contentPx: number) => {
    const expression = track
      .replace(/(\d+(?:\.\d+)?)cqi/g, `($1 * ${contentPx} / 100)`)
      .replace(/(\d+(?:\.\d+)?)rem/g, `($1 * ${REM})`)
    const clamp = (low: number, value: number, high: number) =>
      Math.min(Math.max(value, low), high)
    return new Function('clamp', 'min', `return ${expression}`)(
      clamp,
      Math.min
    ) as number
  }

  const trackAt = (levels: number, contentPx: number, depth = 0) => {
    const $ = html(
      stackRow(
        0,
        Array.from({ length: levels }, (_, at) => at === levels - 1),
        false
      )
    )
    const rule = paneRuleAt(
      rules,
      $(`[data-depth="${depth}"]`),
      contentPx / REM
    )
    const track = rule!.body.match(/flex: 0 0 (.*?); order/)![1]!
    return Math.round(trackPx(track, contentPx))
  }

  const inspectorRow = (levels: number) =>
    html(
      stackRow(
        0,
        Array.from({ length: levels }, (_, depth) => depth === levels - 1),
        false
      ).replace(
        '</div></div>',
        '</div><div data-slot="pane" data-role="inspector" data-level="0"></div></div>'
      )
    )

  // A sweep calls this every 1px, so the hide threshold is resolved from the
  // matching rules once per inspector element rather than re-scanning and
  // re-matching every rule on every step: hidden below the widest threshold
  // any matching rule names, shown at or above it.
  const inspectorHideThresholds = new WeakMap<Element, number>()
  const inspectorHideThreshold = (inspector: Element) => {
    const cached = inspectorHideThresholds.get(inspector)
    if (cached !== undefined) return cached
    const threshold = rules
      .filter(
        (rule) =>
          rule.body === 'display: none !important;' &&
          inspector.matches(rule.selector)
      )
      .reduce((widest, rule) => {
        const widths = rule.conditions
          .map(
            (condition) =>
              condition.match(/@container panes \(width < ([\d.]+)rem\)/)?.[1]
          )
          .filter((width): width is string => width !== undefined)
          .map(Number)
        const ruleThreshold =
          widths.length > 0 ? Math.min(...widths) * REM : Infinity
        return Math.max(widest, ruleThreshold)
      }, -Infinity)
    inspectorHideThresholds.set(inspector, threshold)
    return threshold
  }
  const inspectorShownAt = (inspector: Element, contentPx: number) =>
    contentPx >= inspectorHideThreshold(inspector)

  // A stacked row positions its panes absolutely, so nothing can sit beside them.
  it.each([1, 2, 3])(
    'never shows the inspector while the row is stacked, %i levels',
    (levels) => {
      const inspector = inspectorRow(levels)('[data-role="inspector"]')
      expect(inspectorHideThreshold(inspector)).toBeGreaterThanOrEqual(
        rowTier(2, levels - 1, levels) * REM
      )
    }
  )

  // Every 1px of content from a single column to past the widest tier.
  it.each([1, 2, 3, 4])(
    'never squeezes the fill below its minimum beside a shown inspector, %i levels',
    (levels) => {
      const $ = inspectorRow(levels)
      const inspector = $('[data-role="inspector"]')
      const panes = Array.from({ length: levels }, (_, depth) =>
        $(`[data-depth="${depth}"]`)
      )
      let shownAt = 0
      for (let contentPx = 600; contentPx <= 1800; contentPx += 1) {
        if (columnsAt(contentPx, levels - 1, levels) === 1) continue
        if (!inspectorShownAt(inspector, contentPx)) continue
        shownAt += 1
        const bodies = panes.map(
          (pane) => paneRuleAt(rules, pane, contentPx / REM)!.body
        )
        const parents = bodies
          .map((body) => body.match(/flex: 0 0 (.*?); order/)?.[1])
          .filter((track): track is string => track !== undefined)
          .reduce((sum, track) => sum + trackPx(track, contentPx), 0)
        const shown = bodies.filter(
          (body) => !body.includes('visibility: hidden')
        ).length
        const fill =
          contentPx - 1.5 * REM - parents - 14 * REM - shown * 0.75 * REM
        expect(fill, `${contentPx}px`).toBeGreaterThanOrEqual(28 * REM)
      }
      expect(shownAt).toBeGreaterThan(0)
    }
  )

  it('never uses more columns than the row has levels', () => {
    expect(visibleColumns(3, 2)).toBe(2)
    expect(visibleColumns(3, 4)).toBe(3)
    expect(visibleColumns(2, 1)).toBe(1)
  })

  // Content widths beside an 80px navigation at 1320 and 1440.
  it.each([
    [1240, 384],
    [1360, 384]
  ])(
    'keeps a two-level list on the two-column track at %ipx of content',
    (contentPx, expected) => {
      expect(columnsAt(contentPx)).toBe(3)
      expect(trackAt(2, contentPx)).toBe(expected)
    }
  )

  // Beside an 80px navigation at 1000, 1200 and 1440, and a 240px one at 1440.
  it.each([
    [920, [400]],
    [1120, [448]],
    [1360, [340, 435]],
    [1200, [480]]
  ])(
    'widens a detail in the middle past the list at %ipx of content',
    (contentPx, expected) => {
      const parents = expected.length === 1 ? [1] : [0, 1]
      expect(parents.map((depth) => trackAt(3, contentPx, depth))).toEqual(
        expected
      )
    }
  )

  it('gives both parents the detail track once the window slides past the root', () => {
    expect([1, 2].map((depth) => trackAt(4, 1360, depth))).toEqual([432, 432])
  })
})

describe('the generated stylesheet', () => {
  it('is what the table renders', () => {
    expect(committedCss).toBe(renderPaneColumnsCss())
  })

  it('draws one button at most in every rule', () => {
    const css = renderPaneColumnsCss()
    expect(css).not.toMatch(/--pane-back: grid; --pane-close: grid/)
  })

  it('hides past any display utility and never sets a display of its own', () => {
    const displays = rules.filter(
      (rule) =>
        /(^|; )display:/.test(rule.body) &&
        !/pane-(back|close)"\]$/.test(rule.selector)
    )
    expect(displays.length).toBeGreaterThan(0)
    for (const rule of displays) {
      expect(rule.body, rule.selector).toBe('display: none !important;')
    }

    const hiddenAt = (element: Element, contentPx: number) =>
      hiddenBy(element).some((rule) =>
        rule.conditions.every((condition) => {
          const width = condition.match(/\(width < ([\d.]+)rem\)/)?.[1]
          return width === undefined || contentPx < Number(width) * REM
        })
      )
    const tier = inspectorTier(2) * REM
    let $ = html(
      stackRow(0, [false, true], false, { closedMore: true }).replace(
        '</div></div>',
        '</div><div data-slot="pane" data-role="inspector" data-level="0" class="grid"></div></div>'
      )
    )
    expect(hiddenAt($('[data-role="inspector"]'), tier - 1)).toBe(true)
    expect(hiddenAt($('[data-role="inspector"]'), tier)).toBe(false)
    expect(hiddenAt($('[data-overflow]'), tier)).toBe(true)

    $ = html(
      '<div data-slot="navigator-panes" data-level="0"><div data-slot="pane" data-role="inspector" data-level="0"></div></div>'
    )
    expect(hiddenAt($('[data-role="inspector"]'), 2000)).toBe(true)
  })

  it("keeps an outer More's state out of a nested row", () => {
    const pane = (level: number, depth: number, extra = '') =>
      `<div data-slot="pane" data-stack data-level="${level}" data-depth="${depth}" ${extra}>`
    const nested = (outer: string, inner: string) =>
      html(`
        <div data-slot="navigator-panes" data-level="0" ${outer}>
          ${pane(0, 0, 'id="outer-root"')}</div>
          ${pane(0, 0, 'id="outer-more" data-overflow')}</div>
          ${pane(0, 1)}
            <div data-slot="navigator-panes" data-level="1" ${inner}>
              ${pane(1, 0, 'id="inner-root"')}</div>
              ${pane(1, 0, 'id="inner-more" data-overflow')}</div>
            </div>
          </div>
        </div>`)

    let $ = nested('data-overflow data-reveal', '')
    expect(hiddenBy($('#outer-root'))).toHaveLength(1)
    expect(hiddenBy($('#outer-more'))).toHaveLength(0)
    expect(hiddenBy($('#inner-root'))).toHaveLength(0)
    expect(hiddenBy($('#inner-more'))).toHaveLength(1)

    $ = nested('', 'data-overflow data-reveal')
    expect(hiddenBy($('#outer-root'))).toHaveLength(0)
    expect(hiddenBy($('#outer-more'))).toHaveLength(1)
    expect(hiddenBy($('#inner-root'))).toHaveLength(1)
    expect(hiddenBy($('#inner-more'))).toHaveLength(0)
  })

  it("keeps a navigator's md padding to its own row", () => {
    const padded = (row: Element) =>
      rules
        .filter((rule) => rule.body === 'padding-inline-start: 0;')
        .filter((rule) => row.matches(rule.selector))
    const nested = (outer: string, inner: string) =>
      html(`
        <div data-slot="navigator">
          <nav data-slot="navigator-primary" data-orientation="${outer}"></nav>
          <main data-slot="navigator-content">
            <div data-slot="navigator-panes" data-level="0" id="outer-row">
              <div data-slot="pane" data-stack data-level="0" data-depth="0">
                <div data-slot="navigator">
                  <nav data-slot="navigator-primary" data-orientation="${inner}"></nav>
                  <main data-slot="navigator-content">
                    <div data-slot="navigator-panes" data-level="1" id="inner-row"></div>
                  </main>
                </div>
              </div>
            </div>
          </main>
        </div>`)

    let $ = nested('vertical', 'horizontal')
    expect(padded($('#outer-row')).length).toBeGreaterThan(0)
    expect(padded($('#inner-row'))).toHaveLength(0)

    $ = nested('horizontal', 'vertical')
    expect(padded($('#outer-row'))).toHaveLength(0)
    expect(padded($('#inner-row')).length).toBeGreaterThan(0)
  })

  it("widens a navigator's clip into its vertical primary's gutter, from md, for its own Content only", () => {
    const widened = (content: Element) =>
      rules.filter(
        (rule) =>
          rule.body ===
            'margin-inline-start: -0.5rem; padding-inline-start: 0.5rem;' &&
          content.matches(rule.selector)
      )
    const covered = (content: Element) =>
      rules.filter(
        (rule) =>
          rule.selector.endsWith('::before') &&
          content.matches(rule.selector.replace('::before', ''))
      )
    const nested = (outer: string, inner: string) =>
      html(`
        <div data-slot="navigator">
          ${outer === 'none' ? '' : `<div data-slot="navigator-primary" data-orientation="${outer}"></div>`}
          <main data-slot="navigator-content" id="outer">
            <div data-slot="navigator-panes" data-level="0">
              <div data-slot="pane" data-stack data-level="0" data-depth="0">
                <div data-slot="navigator">
                  ${inner === 'none' ? '' : `<div data-slot="navigator-primary" data-orientation="${inner}"></div>`}
                  <main data-slot="navigator-content" id="inner">
                    <div data-slot="navigator-panes" data-level="1"></div>
                  </main>
                </div>
              </div>
            </div>
          </main>
        </div>`)

    let $ = nested('vertical', 'none')
    expect(widened($('#outer'))).toHaveLength(1)
    expect(covered($('#outer'))).toHaveLength(1)
    expect(widened($('#inner'))).toHaveLength(0)
    expect(covered($('#inner'))).toHaveLength(0)
    for (const rule of [...widened($('#outer')), ...covered($('#outer'))]) {
      expect(rule.conditions).toContain('@media (width >= 48rem)')
    }
    const [cover] = covered($('#outer'))
    expect(cover!.body).toContain('inline-size: 0.5rem;')
    expect(cover!.body).toContain('z-index: 1;')

    $ = nested('horizontal', 'vertical')
    expect(widened($('#outer'))).toHaveLength(0)
    expect(widened($('#inner'))).toHaveLength(1)
    $ = nested('none', 'none')
    expect(widened($('#outer'))).toHaveLength(0)
  })

  it('keeps the cover under a landed pane and over a sliding one', () => {
    const cover = rules.find((rule) => rule.selector.endsWith('::before'))!
    const z = (body: string) => Number(body.match(/z-index: (\d)/)?.[1])
    expect(z(cover.body)).toBe(1)
    const landed = rules.filter(
      (rule) =>
        rule.body.includes('--pane-back') &&
        rule.body.includes('visibility: visible')
    )
    const parked = rules.filter(
      (rule) =>
        rule.body.includes('--pane-back') &&
        rule.body.includes('visibility: hidden')
    )
    for (const rule of landed) expect(z(rule.body)).toBeGreaterThan(1)
    for (const rule of parked) expect(z(rule.body)).toBeLessThan(1)
  })

  it("keeps a navigator's flush start edge to its own row", () => {
    const flush = (row: Element) =>
      rules
        .filter((rule) => rule.body === '--pane-stack-inset-start: 0px;')
        .filter((rule) => row.matches(rule.selector))
    const reset = (row: Element) =>
      rules.filter(
        (rule) =>
          rule.body === '--pane-stack-inset-start: var(--pane-stack-inset);' &&
          row.matches(rule.selector)
      )
    const nested = (outer: string, inner: string) =>
      html(`
        <div data-slot="navigator">
          <div data-slot="navigator-primary" data-orientation="${outer}"></div>
          <main data-slot="navigator-content">
            <div data-slot="navigator-panes" data-level="0" id="outer-row">
              <div data-slot="pane" data-stack data-level="0" data-depth="0">
                <div data-slot="navigator">
                  ${inner === 'none' ? '' : `<div data-slot="navigator-primary" data-orientation="${inner}"></div>`}
                  <main data-slot="navigator-content">
                    <div data-slot="navigator-panes" data-level="1" id="inner-row"></div>
                  </main>
                </div>
              </div>
            </div>
          </main>
        </div>`)

    for (const inner of ['none', 'horizontal']) {
      const $ = nested('vertical', inner)
      expect(flush($('#outer-row'))).toHaveLength(1)
      expect(flush($('#inner-row')), inner).toHaveLength(0)
      expect(reset($('#inner-row'))).toHaveLength(1)
    }

    const $ = nested('horizontal', 'vertical')
    expect(flush($('#outer-row'))).toHaveLength(0)
    expect(flush($('#inner-row'))).toHaveLength(1)
  })

  it('reads the inspector variant from the row the element sits in', () => {
    const branches = Array.from(
      renderPaneColumnsCss().matchAll(
        /@container panes \(width < ([\d.]+)rem\) \{ (.*) \{ @slot; \} \}/g
      ),
      ([, width, selector]) => ({
        width: Number(width),
        selector: selector!.replace('&', '#trigger')
      })
    )
    const yieldedAt = (trigger: Element) =>
      branches
        .filter((branch) => trigger.matches(branch.selector))
        .map((branch) => branch.width)
    const row = (level: number, levels: number, inner: string) =>
      `<div data-slot="navigator-panes" data-level="${level}">${Array.from(
        { length: levels },
        (_, depth) =>
          `<div data-slot="pane" data-stack data-level="${level}" data-depth="${depth}" ${depth === levels - 1 ? 'data-current' : ''}>${depth === levels - 1 ? inner : ''}</div>`
      ).join('')}</div>`
    const trigger = '<button id="trigger"></button>'

    let $ = html(row(0, 3, trigger))
    expect(yieldedAt($('#trigger'))).toEqual([inspectorTier(3)])

    $ = html(row(0, 3, row(1, 2, trigger)))
    expect(yieldedAt($('#trigger'))).toEqual([inspectorTier(2)])
    expect(
      branches.filter((branch) => $('#trigger').matches(branch.selector))
    ).toEqual([
      expect.objectContaining({
        selector: expect.stringMatching(
          /^\[data-slot="navigator-panes"\]\[data-level="1"\]/
        )
      })
    ])
  })

  it('counts and places panes of one level only', () => {
    const css = renderPaneColumnsCss()
    const rules = css
      .split('\n')
      .filter((line) => line.includes('[data-stack]'))
      // The variant's guard names the nested row only to step out of it.
      .map((line) =>
        line.replace(
          /:not\(\[data-slot="navigator-panes"\]\[data-level="\d"\] \*\)/g,
          ''
        )
      )
    for (const rule of rules) {
      const levels = new Set(rule.match(/\[data-level="(\d)"\]/g))
      expect(levels.size).toBe(1)
    }
  })

  it('reaches the inspector of its own level only', () => {
    const css = renderPaneColumnsCss()
    const rules = css
      .split('\n')
      .filter((line) => line.includes('[data-role="inspector"][data-level'))
    expect(rules).toHaveLength(9 * PANE_MAX_LEVELS)
    for (const rule of rules) {
      const levels = new Set(rule.match(/\[data-level="(\d)"\]/g))
      expect(levels.size).toBe(1)
    }
  })
})

describe('the stacked tier keeps the md inset and the edge cover', () => {
  it('insets every stack pane by the gutter Content publishes', () => {
    const base = rules.filter((rule) =>
      rule.body.startsWith('position: absolute !important;')
    )
    expect(base).toHaveLength(2 * PANE_MAX_LEVELS)
    for (const rule of base) {
      expect(rule.body).toContain('inset: var(--pane-stack-inset, 0px);')
      expect(rule.body).toContain(
        'inset-inline-start: var(--pane-stack-inset-start, var(--pane-stack-inset, 0px));'
      )
    }
  })

  it('parks an ahead pane clear of the gutter', () => {
    const ahead = rules
      .filter(stacked)
      .filter((rule) => rule.body.includes('translate: calc((100%'))
    expect(ahead.length).toBeGreaterThan(0)
    for (const rule of ahead) {
      expect(rule.body).toContain(
        'translate: calc((100% + var(--pane-stack-inset, 0px)) * var(--pane-dir, 1)) 0;'
      )
    }
  })

  it('mirrors the parked translates in a right-to-left row, per row', () => {
    const behind = rules
      .filter(stacked)
      .filter((rule) => slotOf(rule.body) === 'behind')
    expect(behind.length).toBeGreaterThan(0)
    for (const rule of behind) {
      expect(rule.body).toContain(
        'translate: calc(-33% * var(--pane-dir, 1)) 0;'
      )
    }
    const dirOf = (row: Element) =>
      rules
        .filter(
          (rule) =>
            rule.body.startsWith('--pane-dir:') && row.matches(rule.selector)
        )
        .map((rule) => rule.body)
        .at(-1)
    const $ = html(`
      <div dir="rtl">
        <div data-slot="navigator-panes" data-level="0" id="outer-row">
          <div data-slot="pane" data-stack data-level="0" data-depth="0" dir="ltr">
            <div data-slot="navigator-panes" data-level="1" id="inner-row"></div>
          </div>
        </div>
      </div>`)
    expect(dirOf($('#outer-row'))).toBe('--pane-dir: -1;')
    expect(dirOf($('#inner-row'))).toBe('--pane-dir: 1;')
  })

  it('lifts the top pane over the cover once it lands and drops a leaving pane at once', () => {
    const top = rules
      .filter(stacked)
      .filter((rule) => rule.body.includes('visibility: visible;'))
    const parked = rules
      .filter(stacked)
      .filter((rule) => rule.body.includes('visibility: hidden;'))
    expect(top.length).toBeGreaterThan(0)
    expect(parked.length).toBeGreaterThan(0)
    for (const rule of top) {
      expect(rule.body).toContain('z-index: 2;')
      expect(rule.body).toContain(
        'transition-property: translate, opacity, z-index; transition-timing-function: var(--ease-enter), var(--ease-enter), step-end;'
      )
    }
    for (const rule of parked) {
      expect(rule.body).toContain('z-index: 0;')
      expect(rule.body).toContain(
        'transition-property: translate, opacity, visibility, z-index; transition-timing-function: var(--ease-enter), var(--ease-enter), var(--ease-enter), step-start;'
      )
    }
  })

  it('animates only without a reduced-motion preference, and never in columns', () => {
    // A pane on its way out carries its own duration; it is gated separately.
    const durations = rules.filter(
      (rule) =>
        rule.body.includes('transition-duration') &&
        !rule.selector.endsWith('[data-exiting]')
    )
    expect(durations).toHaveLength(PANE_MAX_LEVELS)
    for (const rule of durations) {
      expect(rule.conditions).toEqual([
        '@layer components',
        '@media (prefers-reduced-motion: no-preference)'
      ])
      expect(rule.selector).toContain('[data-pushing]')
    }
    expect(columnRules.length).toBeGreaterThan(0)
    for (const rule of columnRules) {
      expect(rule.body).toMatch(/transition: none;$/)
      expect(rule.body).not.toContain('transition-property')
    }
  })

  it('slides only while its own row is pushing', () => {
    const sliding = (pane: Element) =>
      rules.some(
        (rule) =>
          rule.body.includes('transition-duration') &&
          pane.matches(rule.selector)
      )
    const nested = (outer: string, inner: string) =>
      html(`
        <div data-slot="navigator-panes" data-level="0" ${outer}>
          <div data-slot="pane" data-stack data-level="0" data-depth="0" id="outer-pane">
            <div data-slot="navigator-panes" data-level="1" ${inner}>
              <div data-slot="pane" data-stack data-level="1" data-depth="0" id="inner-pane"></div>
            </div>
          </div>
        </div>`)

    let $ = nested('', '')
    expect(sliding($('#outer-pane'))).toBe(false)
    expect(sliding($('#inner-pane'))).toBe(false)

    $ = nested('data-pushing', '')
    expect(sliding($('#outer-pane'))).toBe(true)
    expect(sliding($('#inner-pane'))).toBe(false)

    $ = nested('', 'data-pushing')
    expect(sliding($('#outer-pane'))).toBe(false)
    expect(sliding($('#inner-pane'))).toBe(true)
  })

  it('keeps landed columns over the cover', () => {
    for (const rule of columnRules.filter((r) =>
      r.body.includes('position: relative')
    )) {
      expect(rule.body).toContain('z-index: 2;')
    }
  })
})

describe('a pane that mounts as the top', () => {
  const entering = rules.filter((rule) =>
    rule.conditions.includes('@starting-style')
  )
  const AHEAD =
    'translate: calc((100% + var(--pane-stack-inset, 0px)) * var(--pane-dir, 1)) 0;'
  const entersFrom = (pane: Element) =>
    entering.some((rule) => pane.matches(rule.selector))

  it('starts ahead, in the reading direction, only stacked, pushing and with motion allowed', () => {
    expect(entering.length).toBeGreaterThan(0)
    for (const rule of entering) {
      expect(rule.body).toBe(AHEAD)
      expect(rule.selector).toContain('[data-pushing]')
      expect(rule.conditions).toEqual([
        '@layer components',
        `@container panes (width < ${stackedUntil()}rem)`,
        '@media (prefers-reduced-motion: no-preference)',
        '@starting-style'
      ])
    }
  })

  it('outranks the landed rule it starts from: the same selector, plus the push', () => {
    const landed = new Set(rules.map((rule) => rule.selector))
    for (const rule of entering) {
      expect(landed).toContain(rule.selector.replace('[data-pushing]', ''))
    }
  })

  it('slides in over a shallower pane, and never as the row it arrives with', () => {
    const row = (pushing: boolean, current: boolean[]) =>
      html(
        stackRow(0, current, false).replace(
          'data-level="0" ',
          `data-level="0" ${pushing ? 'data-pushing' : ''} `
        )
      )

    let $ = row(true, [false, true])
    expect(entersFrom($('[data-depth="1"]'))).toBe(true)
    expect(entersFrom($('[data-depth="0"]'))).toBe(false)

    $ = row(false, [false, true])
    expect(entersFrom($('[data-depth="1"]'))).toBe(false)

    // A row of one pane is all root: nothing to slide over.
    $ = row(true, [true])
    expect(entersFrom($('[data-depth="0"]'))).toBe(false)
  })

  it('slides a pane past depth 3 in as well', () => {
    const deep = (pushing: boolean) =>
      html(
        stackRow(0, [false, false, false, false, true], false)
          .replace('data-depth="4"', 'data-depth="deep"')
          .replace(
            'data-level="0" ',
            `data-level="0" ${pushing ? 'data-pushing' : ''} `
          )
      )
    expect(entersFrom(deep(true)('[data-depth="deep"]'))).toBe(true)
    expect(entersFrom(deep(false)('[data-depth="deep"]'))).toBe(false)
  })
})

describe('a pane held for its exit', () => {
  const leaving = rules.filter((rule) =>
    /\[data-exiting\](\[data-exit="\w+"\])?$/.test(rule.selector)
  )
  const parked = leaving.filter((rule) => rule.selector.includes('[data-exit='))
  const moving = leaving.filter(
    (rule) => !rule.selector.includes('[data-exit=')
  )
  const AHEAD =
    'translate: calc((100% + var(--pane-stack-inset, 0px)) * var(--pane-dir, 1)) 0;'
  const BEHIND = 'translate: calc(-33% * var(--pane-dir, 1)) 0;'

  const exitingRow = (exiting: boolean) =>
    html(
      `<div data-slot="navigator-panes" data-level="0">` +
        `<div data-slot="pane" data-stack data-level="0" data-depth="0" data-current></div>` +
        `<div data-slot="pane" data-stack data-level="0" data-depth="1" data-current ${
          exiting ? 'data-exiting data-exit="ahead"' : ''
        }></div>` +
        `</div>`
    )

  it('places no leaving pane through a landed rule', () => {
    const placing = rules.filter(
      (rule) =>
        rule.body.includes('--pane-back') &&
        rule.selector.startsWith('[data-slot="navigator-panes"]')
    )
    expect(placing.length).toBeGreaterThan(0)
    for (const rule of placing) {
      expect(rule.selector.endsWith(':not([data-exiting])')).toBe(true)
    }
  })

  it('parks it where it is going, and cuts with no transition', () => {
    expect(parked).toHaveLength(2 * PANE_MAX_LEVELS)
    for (const rule of parked) {
      expect(rule.conditions).toEqual(['@layer components'])
      expect(rule.body).toContain('transition: none;')
      expect(rule.body).toContain('visibility: hidden;')
      expect(rule.body).toContain(
        rule.selector.includes('ahead') ? AHEAD : BEHIND
      )
      // Forward over the pane it uncovers, behind under the one arriving.
      expect(rule.body).toContain(
        rule.selector.includes('ahead') ? 'z-index: 3;' : 'z-index: 0;'
      )
    }
  })

  it('only slides while the row is stacked and motion is allowed', () => {
    expect(moving).toHaveLength(PANE_MAX_LEVELS)
    for (const rule of moving) {
      expect(rule.conditions).toEqual([
        '@layer components',
        `@container panes (width < ${stackedUntil()}rem)`,
        '@media (prefers-reduced-motion: no-preference)'
      ])
      expect(rule.body).toContain('transition-duration: var(--duration-slow);')
      expect(rule.body).toContain('transition-property: translate')
    }
  })

  it('is neither a level nor the top: the row reads as the panes that stay', () => {
    const $ = exitingRow(true)
    // The pane below is the whole row now, so it lands rather than sitting behind.
    expect(paneRuleAt(rules, $('[data-depth="0"]'), 20)?.body).toContain(
      'translate: 0 0;'
    )
    expect(paneRuleAt(rules, $('[data-depth="1"]'), 20)).toBeUndefined()
  })

  it('reads as two levels again once the pane stops leaving', () => {
    const $ = exitingRow(false)
    expect(paneRuleAt(rules, $('[data-depth="0"]'), 20)?.body).toContain(BEHIND)
    expect(paneRuleAt(rules, $('[data-depth="1"]'), 20)?.body).toContain(
      'translate: 0 0;'
    )
  })
})

describe('panes without the new attributes', () => {
  it('gates every generated rule on data-depth or data-level', () => {
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      if (rule.conditions.some((c) => c.startsWith('@keyframes'))) continue
      expect(rule.selector).toMatch(/\[data-depth|\[data-level="/)
    }
  })

  it('match no generated rule', () => {
    const $ = html(`
      <div data-slot="navigator">
        <div data-slot="navigator-primary" data-orientation="vertical"></div>
        <div data-slot="navigator-content">
          <div data-slot="pane" data-role="list" data-current>
            <div data-slot="pane-header">
              <div data-slot="pane-back"></div>
              <div data-slot="pane-close"></div>
            </div>
          </div>
          <div data-slot="pane" data-role="detail" data-overflow>
            <div data-slot="pane-header">
              <div data-slot="pane-back"></div>
              <div data-slot="pane-close"></div>
            </div>
          </div>
          <div data-slot="pane" data-role="inspector"></div>
        </div>
      </div>`)
    const elements = Array.from(
      $('[data-slot="navigator"]').querySelectorAll('*')
    )
    for (const element of [$('[data-slot="navigator"]'), ...elements]) {
      expect(
        rules
          .filter((rule) => element.matches(rule.selector))
          .map((r) => r.selector)
      ).toEqual([])
    }
  })
})
