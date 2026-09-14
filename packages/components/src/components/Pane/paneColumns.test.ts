import { describe, expect, it } from 'vitest'

import committedCss from '../../css/pane-columns.css?raw'
import { type PaneEntry, derivePositions } from '../Navigator/paneStack'
import {
  type PaneColumnsRule,
  paneColumnsRulesOf
} from '../Navigator/testUtils'
import {
  PANE_MAX_COLUMNS,
  PANE_MAX_DEPTH,
  PANE_MAX_LEVELS,
  columnTier,
  inspectorTier,
  paneCell,
  parentTrack,
  renderPaneColumnsCss,
  visibleColumns
} from './paneColumns'

const rules = paneColumnsRulesOf(renderPaneColumnsCss())
const stacked = (rule: PaneColumnsRule) =>
  /\[data-depth="\d"\]$/.test(rule.selector) &&
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
    .filter((rule) => rule.body === 'display: none;')
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
      : body.includes('translate: -33%')
        ? 'behind'
        : body.includes('translate: calc(100%')
          ? 'ahead'
          : 'top'

// Content widths, in rem, that the prototype frames measured at 16px/rem.
const REM = 16
const columnsAt = (px: number) =>
  px / REM >= columnTier(3) ? 3 : px / REM >= columnTier(2) ? 2 : 1

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
  it('fits two columns at 46.25rem and three at 63rem', () => {
    expect(columnTier(1)).toBe(0)
    expect(columnTier(2)).toBe(46.25)
    expect(columnTier(3)).toBe(63)
  })

  it('fits the inspector once every level present fits beside it at its minimum', () => {
    expect(inspectorTier(1)).toBe(44.25)
    expect(inspectorTier(2)).toBe(69)
    expect(inspectorTier(3)).toBe(85.75)
    expect(inspectorTier(4)).toBe(85.75)
  })

  it('never starves the fill below its minimum', () => {
    expect(parentTrack(2)).toBe(
      'clamp(16rem, min(40cqi, 100cqi - 30.25rem), 24rem)'
    )
    expect(parentTrack(3)).toBe(
      'clamp(16rem, min(25cqi, (100cqi - 31rem) / 2), 20rem)'
    )
  })
})

describe('paneCell — the prototype evidence', () => {
  it('Tickets → Glamping → Sam, Sam current', () => {
    expect(shown(columnsAt(375), 2, 3)).toBe('2[Back]')
    expect(shown(columnsAt(760), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(932), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(1188), 2, 3)).toBe('0 | 1 | 2[Close]')
    expect(shown(columnsAt(1348), 2, 3)).toBe('0 | 1 | 2[Close]')
  })

  it('two levels: Close on the detail, no Back', () => {
    expect(shown(columnsAt(375), 1, 2)).toBe('1[Back]')
    expect(shown(columnsAt(760), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(932), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(1188), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(1348), 1, 2)).toBe('0 | 1[Close]')
  })

  it('three levels with the root revealed: Sam parked ahead', () => {
    expect(shown(columnsAt(375), 0, 3)).toBe('0')
    expect(shown(columnsAt(760), 0, 3)).toBe('0 | 1')
    expect(shown(columnsAt(932), 0, 3)).toBe('0 | 1')
    expect(shown(columnsAt(1188), 0, 3)).toBe('0 | 1 | 2')
    expect(shown(columnsAt(1348), 0, 3)).toBe('0 | 1 | 2')
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

describe('agreement with derivePositions', () => {
  const entry = (current: boolean): PaneEntry => ({
    role: 'detail',
    current,
    primaryNav: 'auto'
  })

  it('names the same top, behind and ahead panes in the stacked tier', () => {
    for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
      for (let top = 0; top < levels; top += 1) {
        const entries = Array.from({ length: levels }, (_, depth) =>
          entry(depth === top && top > 0)
        )
        const positions = derivePositions(entries, top === 0)
        positions.forEach((position, depth) => {
          expect(paneCell(1, top, depth, levels).slot).toBe(position)
        })
      }
    }
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
  const tierRules = (columns: number) =>
    rules.filter(
      (rule) =>
        rule.body.includes('--pane-back') &&
        rule.selector.startsWith(
          '[data-slot="navigator-panes"][data-level="0"]'
        ) &&
        (columns === 1
          ? !rule.conditions.some((c) => c.startsWith('@container'))
          : rule.conditions.includes(
              `@container panes (width >= ${columnTier(columns)}rem)`
            ))
    )

  it('gives every stack pane exactly one rule per tier, in the slot paneCell names', () => {
    for (let levels = 2; levels <= 3; levels += 1) {
      for (const { reveal, current } of stackStates(levels)) {
        const $ = html(stackRow(0, current, reveal))
        const top = reveal ? 0 : Math.max(0, current.lastIndexOf(true))
        for (let columns = 1; columns <= PANE_MAX_COLUMNS; columns += 1) {
          const candidates = tierRules(columns)
          for (let depth = 0; depth < levels; depth += 1) {
            const pane = $(`[data-depth="${depth}"]`)
            const matched = candidates.filter((rule) =>
              pane.matches(rule.selector)
            )
            const state = `levels ${levels}, reveal ${reveal}, current ${current}, C=${columns}, depth ${depth}`
            expect(matched, state).toHaveLength(1)
            const cell = paneCell(columns, top, depth, levels)
            expect(slotOf(matched[0]!.body), state).toBe(cell.slot)
            expect(matched[0]!.body, state).toContain(
              `--pane-back: ${cell.back ? 'grid' : 'none'}; --pane-close: ${cell.close ? 'grid' : 'none'};`
            )
          }
        }
      }
    }
  })

  it('reads a row with nothing at depth 0 one depth shallower, so its first pane is the root', () => {
    for (const closedMore of [false, true]) {
      for (let levels = 1; levels <= 3; levels += 1) {
        for (const { reveal, current } of stackStates(levels)) {
          const $ = html(stackRow(0, current, reveal, { base: 1, closedMore }))
          const top = reveal ? 0 : Math.max(0, current.lastIndexOf(true))
          for (let columns = 1; columns <= PANE_MAX_COLUMNS; columns += 1) {
            const candidates = tierRules(columns)
            for (let depth = 0; depth < levels; depth += 1) {
              const pane = $(`[data-depth="${depth + 1}"]:not([data-overflow])`)
              const matched = candidates.filter((rule) =>
                pane.matches(rule.selector)
              )
              const state = `closed More ${closedMore}, levels ${levels}, reveal ${reveal}, current ${current}, C=${columns}, written depth ${depth + 1}`
              expect(matched, state).toHaveLength(1)
              const cell = paneCell(columns, top, depth, levels)
              expect(slotOf(matched[0]!.body), state).toBe(cell.slot)
              expect(matched[0]!.body, state).toContain(
                `--pane-back: ${cell.back ? 'grid' : 'none'}; --pane-close: ${cell.close ? 'grid' : 'none'};`
              )
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
      tierRules(columns).filter((rule) => pane.matches(rule.selector))
    expect(slotOf(at(1, more)[0]!.body)).toBe('top')
    expect(slotOf(at(1, detail)[0]!.body)).toBe('ahead')
    expect(slotOf(at(2, more)[0]!.body)).toBe('parent')
    expect(slotOf(at(2, detail)[0]!.body)).toBe('fill')
  })

  it('leaves a pane past depth 3 to the standalone defaults', () => {
    const $ = html(stackRow(0, [false, false, false, false, true], false))
    const fifth = $('[data-depth="4"]')
    expect(
      rules
        .filter((rule) => fifth.matches(rule.selector))
        .map((rule) => rule.selector)
    ).toEqual([
      '[data-slot="pane"][data-depth]',
      '[data-slot="pane"][data-depth]:not([data-depth="0"])'
    ])
    for (let depth = 0; depth <= PANE_MAX_DEPTH; depth += 1) {
      const pane = $(`[data-depth="${depth}"]`)
      expect(
        rules.filter(
          (rule) =>
            rule.body.startsWith('position: absolute') &&
            pane.matches(rule.selector)
        )
      ).toHaveLength(1)
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

  const listTrackAt = (levels: number, contentPx: number) => {
    const columns = columnsAt(contentPx)
    const $ = html(
      stackRow(
        0,
        Array.from({ length: levels }, (_, depth) => depth === levels - 1),
        false
      )
    )
    const list = $('[data-depth="0"]')
    const [rule] = rules.filter(
      (candidate) =>
        candidate.conditions.includes(
          `@container panes (width >= ${columnTier(columns)}rem)`
        ) &&
        candidate.body.includes('--pane-back') &&
        list.matches(candidate.selector)
    )
    const track = rule!.body.match(/flex: 0 0 (.*?); order/)![1]!
    return Math.round(trackPx(track, contentPx))
  }

  // Every 1px of content from a single column to past the widest tier.
  it.each([2, 3])(
    'never squeezes the fill below its minimum beside a shown inspector, %i levels',
    (levels) => {
      const $ = html(
        stackRow(
          0,
          Array.from({ length: levels }, (_, depth) => depth === levels - 1),
          false
        ).replace(
          '</div></div>',
          '</div><div data-slot="pane" data-role="inspector" data-level="0"></div></div>'
        )
      )
      const inspector = $('[data-role="inspector"]')
      const panes = Array.from({ length: levels }, (_, depth) =>
        $(`[data-depth="${depth}"]`)
      )
      let shownAt = 0
      for (let contentPx = 600; contentPx <= 1800; contentPx += 1) {
        const columns = columnsAt(contentPx)
        if (columns === 1) continue
        const inspectorShown = rules.some(
          (rule) =>
            rule.body === 'display: block;' &&
            inspector.matches(rule.selector) &&
            rule.conditions.some((condition) => {
              const width = condition.match(
                /@container panes \(width >= ([\d.]+)rem\)/
              )?.[1]
              return width !== undefined && contentPx >= Number(width) * REM
            })
        )
        if (!inspectorShown) continue
        shownAt += 1
        const tier = rules.filter(
          (rule) =>
            rule.body.includes('--pane-back') &&
            rule.conditions.includes(
              `@container panes (width >= ${columnTier(columns)}rem)`
            )
        )
        const bodies = panes
          .map((pane) => tier.find((rule) => pane.matches(rule.selector))!)
          .map((rule) => rule.body)
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

  // Content widths beside an 80px navigation at 1188 and 1440.
  it.each([
    [1108, 384],
    [1360, 384]
  ])(
    'keeps a two-level list on the two-column track at %ipx of content',
    (contentPx, expected) => {
      expect(columnsAt(contentPx)).toBe(3)
      expect(listTrackAt(2, contentPx)).toBe(expected)
    }
  )

  it.each([
    [1108, 277],
    [1360, 320]
  ])(
    'gives a three-level list the three-column track at %ipx of content',
    (contentPx, expected) => {
      expect(listTrackAt(3, contentPx)).toBe(expected)
    }
  )
})

describe('the generated stylesheet', () => {
  it('is what the table renders', () => {
    expect(committedCss).toBe(renderPaneColumnsCss())
  })

  it('scopes every rule to a level', () => {
    const css = renderPaneColumnsCss()
    const rowRules =
      css.match(
        /\[data-slot="navigator-panes"\]\[data-level="[01]"\][^{]*\{/g
      ) ?? []
    expect(rowRules.length).toBeGreaterThan(0)
    for (const rule of rowRules) {
      const level = rule.match(/\[data-level="([01])"\]/)?.[1]
      for (const pane of rule.match(/\[data-stack\][^\s,)]*/g) ?? []) {
        expect(pane).toContain(`[data-level="${level}"]`)
      }
    }
  })

  it('draws one button at most in every rule', () => {
    const css = renderPaneColumnsCss()
    expect(css).not.toMatch(/--pane-back: grid; --pane-close: grid/)
  })

  it('hides the More pane while closed and the other root while open, per level', () => {
    const css = renderPaneColumnsCss()
    for (let level = 0; level < PANE_MAX_LEVELS; level += 1) {
      const row = `[data-slot="navigator-panes"][data-level="${level}"]`
      const pane = `[data-stack][data-level="${level}"]`
      expect(css).toContain(
        `${row}:not([data-overflow]) ${pane}[data-overflow] { display: none; }`
      )
      expect(css).toContain(
        `${row}[data-overflow] ${pane}[data-depth="0"]:not([data-overflow]) { display: none; }`
      )
    }
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

  it('offers the inspector variant with one branch per level count and root depth', () => {
    const css = renderPaneColumnsCss()
    expect(css.match(/@container panes \(width < /g)).toHaveLength(7)
    expect(css).toContain('@custom-variant pane-inspector-yielded {')
  })

  it('counts and places panes of one level only', () => {
    const css = renderPaneColumnsCss()
    const rules = css
      .split('\n')
      .filter((line) => line.includes('[data-stack]'))
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
    expect(rules).toHaveLength(8 * PANE_MAX_LEVELS)
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
    expect(base).toHaveLength(PANE_MAX_LEVELS)
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
      .filter((rule) => rule.body.includes('translate: calc(100%'))
    expect(ahead.length).toBeGreaterThan(0)
    for (const rule of ahead) {
      expect(rule.body).toContain(
        'translate: calc(100% + var(--pane-stack-inset, 0px)) 0;'
      )
    }
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
    const durations = rules.filter((rule) =>
      rule.body.includes('transition-duration')
    )
    expect(durations).toHaveLength(PANE_MAX_LEVELS)
    for (const rule of durations) {
      expect(rule.conditions).toEqual([
        '@layer components',
        '@media (prefers-reduced-motion: no-preference)'
      ])
    }
    expect(columnRules.length).toBeGreaterThan(0)
    for (const rule of columnRules) {
      expect(rule.body).toMatch(/transition: none;$/)
      expect(rule.body).not.toContain('transition-property')
    }
  })

  it('keeps landed columns over the cover', () => {
    for (const rule of columnRules.filter((r) =>
      r.body.includes('position: relative')
    )) {
      expect(rule.body).toContain('z-index: 2;')
    }
  })
})

describe('panes without the new attributes', () => {
  it('gates every generated rule on data-depth or data-level', () => {
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
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
