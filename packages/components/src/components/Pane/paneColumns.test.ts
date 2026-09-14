import { describe, expect, it } from 'vitest'

import committedCss from '../../css/pane-columns.css?raw'
import { type PaneEntry, derivePositions } from '../Navigator/paneStack'
import {
  PANE_MAX_DEPTH,
  PANE_MAX_LEVELS,
  columnTier,
  inspectorTier,
  paneCell,
  parentTrack,
  renderPaneColumnsCss
} from './paneColumns'

type Rule = { selector: string; body: string; conditions: string[] }

function rulesOf(css: string): Rule[] {
  const text = css.slice(css.indexOf('@layer components {'))
  const rules: Rule[] = []
  const conditions: string[] = []
  const token = /([^{}]*)([{}])/g
  let match: RegExpExecArray | null
  while ((match = token.exec(text))) {
    const [, before = '', brace] = match
    const prelude = before.trim()
    if (brace === '}') {
      conditions.pop()
    } else if (prelude.startsWith('@')) {
      conditions.push(prelude)
    } else {
      const close = text.indexOf('}', token.lastIndex)
      rules.push({
        selector: prelude,
        body: text.slice(token.lastIndex, close).trim(),
        conditions: [...conditions]
      })
      token.lastIndex = close + 1
    }
  }
  return rules
}

const rules = rulesOf(renderPaneColumnsCss())
const stacked = (rule: Rule) =>
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

  it('fits the inspector once every level present fits beside it', () => {
    expect(inspectorTier(1)).toBe(44.25)
    expect(inspectorTier(2)).toBe(61)
    expect(inspectorTier(3)).toBe(77.75)
    expect(inspectorTier(4)).toBe(77.75)
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
    expect(shown(columnsAt(760), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(375), 1, 2)).toBe('1[Back]')
  })

  it('three levels with the root revealed: Sam parked ahead', () => {
    expect(shown(columnsAt(760), 0, 3)).toBe('0 | 1')
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

  it('offers the inspector variant with one branch per level count', () => {
    const css = renderPaneColumnsCss()
    expect(css.match(/@container panes \(width < /g)).toHaveLength(4)
    expect(css).toContain('@custom-variant pane-inspector-yielded {')
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
