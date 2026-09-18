import {
  navigatorContentClass,
  navigatorPanesClass
} from '../Navigator/variants'
import {
  PANE_GAP,
  PANE_INSPECTOR,
  PANE_MAX_COLUMNS,
  PANE_MAX_DEPTH,
  columnTier,
  inspectorTier,
  paneCell,
  parentTrackWidth,
  parentsOf,
  rowTier,
  visibleColumns
} from './paneColumns'
import { paneVariants } from './variants'

export const REM = 16
export const STACK_INSET = 12

export type PaneSpec = {
  depth: number | 'deep'
  reached?: boolean
  overflow?: boolean
}

export type RowSpec = {
  level?: number
  panes: PaneSpec[]
  inspector?: boolean
  reveal?: boolean
  overflow?: boolean
  inner?: string
}

export type PaneLayout = {
  shown: boolean
  left: number
  width: number
  back: boolean
  close: boolean
  zIndex: string
  opacity: string
}

const columnOf = (pane: PaneSpec) =>
  pane.overflow || pane.depth !== 0 ? 'detail' : 'list'

const flag = (on: boolean | undefined, name: string) => (on ? ` ${name}` : '')

export function paneMarkup(level: number, pane: PaneSpec, inner = '') {
  return `<section data-slot="pane" data-column="${columnOf(pane)}" data-stack data-level="${level}" data-depth="${pane.depth}"${flag(pane.reached, 'data-reached')}${flag(pane.overflow, 'data-overflow')} class="${paneVariants()}"><div data-slot="pane-back"><button>Back</button></div><div data-slot="pane-close"><button>Close</button></div>${inner}</section>`
}

export function rowMarkup(spec: RowSpec) {
  const level = spec.level ?? 0
  const panes = spec.panes.map((pane, index) =>
    paneMarkup(level, pane, index === 0 ? (spec.inner ?? '') : '')
  )
  const inspector = spec.inspector
    ? `<section data-slot="pane" data-column="inspector" data-level="${level}" class="${paneVariants()}"></section>`
    : ''
  return `<div data-slot="navigator-panes" data-level="${level}"${flag(spec.reveal, 'data-reveal')}${flag(spec.overflow, 'data-overflow')} class="${navigatorPanesClass}">${panes.join('')}${inspector}</div>`
}

export function contentMarkup(row: string) {
  return `<main data-slot="navigator-content" class="${navigatorContentClass}" style="height: 400px">${row}</main>`
}

export function useStylesheet(css: string) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

export function mount(markup: string, width: number, dir = 'ltr') {
  document.body.innerHTML = `<div dir="${dir}" style="width: ${width}px">${markup}</div>`
  return document.querySelector<HTMLElement>('[data-slot="navigator-content"]')!
}

const displayed = (element: Element | null) =>
  element !== null && getComputedStyle(element).display !== 'none'

export function readPane(pane: HTMLElement, content: HTMLElement) {
  const style = getComputedStyle(pane)
  const box = pane.getBoundingClientRect()
  const frame = content.getBoundingClientRect()
  const cell = (slot: string) =>
    displayed(pane.querySelector(`:scope > [data-slot="${slot}"]`))
  return {
    shown: style.display !== 'none' && style.visibility === 'visible',
    left: Math.round(box.left - frame.left),
    width: Math.round(box.width),
    back: cell('pane-back'),
    close: cell('pane-close'),
    zIndex: style.zIndex,
    opacity: style.opacity
  } satisfies PaneLayout
}

/** A rendered row as the model reads it. */
export function rowSpecOf(row: Element): RowSpec {
  const level = row.getAttribute('data-level')
  const panes = row.querySelectorAll(
    `[data-slot="pane"][data-stack][data-level="${level}"]`
  )
  return {
    level: Number(level),
    reveal: row.hasAttribute('data-reveal'),
    overflow: row.hasAttribute('data-overflow'),
    inspector:
      row.querySelector(`[data-column="inspector"][data-level="${level}"]`) !==
      null,
    panes: Array.from(panes, (pane) => {
      const depth = pane.getAttribute('data-depth')!
      return {
        depth: depth === 'deep' ? depth : Number(depth),
        reached: pane.hasAttribute('data-reached'),
        overflow: pane.hasAttribute('data-overflow')
      }
    })
  }
}

type RowModel = {
  levels: number
  top: number
  byRelativeDepth: Map<number, number>
  hidden: Set<number>
}

function modelOf(spec: RowSpec): RowModel {
  const stack = spec.panes.map((pane, index) => ({ ...pane, index }))
  const hasRoot = stack.some((pane) => pane.depth === 0 && !pane.overflow)
  const base = spec.overflow || hasRoot ? 0 : 1
  const hidden = new Set<number>()
  const byRelativeDepth = new Map<number, number>()
  for (const pane of stack) {
    if (pane.depth === 'deep') continue
    const hides = spec.overflow
      ? pane.depth === 0 && !pane.overflow
      : pane.overflow
    if (hides) hidden.add(pane.index)
    else byRelativeDepth.set(pane.depth - base, pane.index)
  }
  const deepest = Math.max(
    ...stack.map((pane) => (pane.depth === 'deep' ? 0 : pane.depth))
  )
  const levels = deepest - base + 1
  let top = 0
  if (!spec.reveal) {
    for (const [relative, index] of byRelativeDepth) {
      if (stack[index]!.reached && relative > top) top = relative
    }
  }
  return { levels, top, byRelativeDepth, hidden }
}

function columnsFor(widthPx: number, top: number, levels: number) {
  let columns = 1
  let widestTier = 0
  for (let candidate = 2; candidate <= PANE_MAX_COLUMNS; candidate += 1) {
    if (candidate > 2 && levels < candidate) continue
    const tier = rowTier(candidate, top, levels)
    if (widthPx / REM >= tier && tier >= widestTier) {
      columns = candidate
      widestTier = tier
    }
  }
  return columns
}

const HIDDEN: PaneLayout = {
  shown: false,
  left: 0,
  width: 0,
  back: false,
  close: false,
  zIndex: '0',
  opacity: '1'
}

/** What the column model says each stack pane, then the inspector, looks like at a content width. */
export function expectedRow(spec: RowSpec, widthPx: number): PaneLayout[] {
  const { levels, top, byRelativeDepth, hidden } = modelOf(spec)
  const columns = columnsFor(widthPx, top, levels)
  const layouts: PaneLayout[] = spec.panes.map(() => ({ ...HIDDEN }))
  const inset = STACK_INSET
  const stackedWidth = widthPx - 2 * inset

  if (columns === 1) {
    for (const [relative, index] of byRelativeDepth) {
      const { slot, back, close } = paneCell(1, top, relative, levels)
      const left =
        slot === 'behind'
          ? inset - 0.33 * stackedWidth
          : slot === 'ahead'
            ? widthPx
            : inset
      layouts[index] = {
        shown: slot === 'top',
        left: Math.round(left),
        width: stackedWidth,
        back,
        close,
        zIndex: slot === 'top' ? '2' : '0',
        opacity: slot === 'behind' ? '0.9' : '1'
      }
    }
  }

  const inspectorShown =
    spec.inspector === true &&
    widthPx >= columnTier(2) * REM &&
    widthPx >= inspectorTier(levels) * REM

  if (columns > 1) {
    const shown = visibleColumns(columns, levels)
    const parents = parentsOf(columns, top, levels)
    const padding = PANE_GAP * REM
    const gap = PANE_GAP * REM
    const cells = [...byRelativeDepth.entries()]
      .sort(([a], [b]) => a - b)
      .map(([relative, index]) => ({
        relative,
        index,
        ...paneCell(columns, top, relative, levels)
      }))
    const inFlow = cells.filter(
      (cell) => cell.slot === 'parent' || cell.slot === 'fill'
    )
    const trackOf = (relative: number) =>
      parentTrackWidth(shown, relative, parents, widthPx / REM) * REM
    const parentsWidth = inFlow
      .filter((cell) => cell.slot === 'parent')
      .reduce((sum, cell) => sum + trackOf(cell.relative), 0)
    const inspectorWidth = inspectorShown ? PANE_INSPECTOR * REM + gap : 0
    const fill =
      widthPx -
      2 * padding -
      parentsWidth -
      gap * (inFlow.length - 1) -
      inspectorWidth
    let left = padding
    for (const cell of cells) {
      const width =
        cell.slot === 'parent'
          ? trackOf(cell.relative)
          : cell.slot === 'fill'
            ? fill
            : 0
      layouts[cell.index] =
        width === 0
          ? { ...HIDDEN }
          : {
              shown: true,
              left: Math.round(left),
              width: Math.round(width),
              back: cell.back,
              close: cell.close,
              zIndex: '2',
              opacity: '1'
            }
      if (width > 0) left += width + gap
    }
  }

  for (const index of hidden) layouts[index] = { ...HIDDEN }

  if (spec.inspector) {
    const right = widthPx - PANE_GAP * REM
    layouts.push(
      inspectorShown
        ? {
            shown: true,
            left: Math.round(right - PANE_INSPECTOR * REM),
            width: PANE_INSPECTOR * REM,
            back: false,
            close: false,
            zIndex: 'auto',
            opacity: '1'
          }
        : { ...HIDDEN, zIndex: 'auto' }
    )
  }
  return layouts
}

export function readRow(content: HTMLElement): PaneLayout[] {
  const row = content.querySelector<HTMLElement>(
    ':scope > [data-slot="navigator-panes"]'
  )!
  return Array.from(
    row.querySelectorAll<HTMLElement>(':scope > [data-slot="pane"]'),
    (pane) => readPane(pane, content)
  )
}

/** What the eye and the keyboard get: a parked pane is only hidden. */
export function onScreen(layouts: PaneLayout[]) {
  return layouts.map((layout) => (layout.shown ? layout : 'hidden'))
}

export const TIER_WIDTHS = [
  ...new Set(
    [46.25, 55.25, 69, 76, 81, 99.75, 105.75].flatMap((tier) => [
      tier * REM - 1,
      tier * REM
    ])
  ),
  360,
  600,
  1000,
  1400,
  1800
].sort((a, b) => a - b)

export const reachedSets = (levels: number) =>
  Array.from({ length: 2 ** levels }, (_, bits) =>
    Array.from({ length: levels }, (_, depth) => (bits & (1 << depth)) !== 0)
  )

export type Extra = 'none' | 'inspector' | 'closedMore' | 'openMore'

/** Every row shape a navigator draws at one level: rooted and detail-first, 1 to 4 levels, every reached set, revealed or not, with an inspector or More. */
export function rowShapes(level = 0): { name: string; spec: RowSpec }[] {
  const shapes: { name: string; spec: RowSpec }[] = []
  for (const base of [0, 1]) {
    for (let levels = 1; base + levels <= PANE_MAX_DEPTH + 1; levels += 1) {
      for (const reached of reachedSets(levels)) {
        for (const reveal of [false, true]) {
          for (const extra of [
            'none',
            'inspector',
            'closedMore',
            'openMore'
          ] as const) {
            const panes: PaneSpec[] = reached.map((isReached, relative) => ({
              depth: base + relative,
              reached: isReached
            }))
            if (extra === 'closedMore' || extra === 'openMore') {
              panes.push({
                depth: 0,
                overflow: true,
                reached: extra === 'openMore'
              })
            }
            shapes.push({
              name: `${base === 0 ? 'rooted' : 'detail-first'}, ${levels} levels / reached ${reached.map(Number).join('')}${reveal ? ', revealed' : ''}, ${extra}`,
              spec: {
                level,
                panes,
                inspector: extra === 'inspector',
                reveal: reveal || extra === 'openMore',
                overflow: extra === 'openMore'
              }
            })
          }
        }
      }
    }
  }
  return shapes
}
