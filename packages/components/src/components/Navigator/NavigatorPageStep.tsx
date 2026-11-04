'use client'

import { Component, createRef } from 'react'

import { prefersReducedMotion } from '../../utils/reducedMotion'
import { listItemVariants } from '../List/variants'
import {
  type NavigatorActiveSecondary,
  isActiveValue
} from './NavigatorContext'
import { secondaryRows } from './secondaryData'

/** Where a destination with an overview stands: its own route, a sub-page on top, or neither. */
export type NavigatorPageAt = 'root' | 'child' | null

type NavigatorPageStepProps = {
  secondary: NavigatorActiveSecondary | null
  value: string | undefined
  at: NavigatorPageAt
  level: number
}

type Snapshot = {
  step: 'push' | 'pop'
  ghost: HTMLElement
  scrollTop: number
  anchor: Anchor | null
  scrolled: Scrolled[]
  /** Where a reversed step picks up: the pane and the ghost as they were mid-slide. */
  from: { ghost: string; pane: string } | null
} | null

/** What the copy lines up by: the first element to start in view, else the deepest across its top, and where it sat. */
type Anchor = { element: Element; top: number }

type Scrolled = { element: Element; top: number; left: number }

const GHOST_FROM = '--page-step-ghost-from'
const PANE_FROM = '--page-step-pane-from'

// Anything that runs code once connected, or draws what a copy can't.
const LIVE = new Set(['iframe', 'video', 'audio', 'object', 'embed', 'canvas'])
const isLive = (element: Element) =>
  LIVE.has(element.localName) || element.localName.includes('-')

const UNSELECTED = listItemVariants({ selected: false }).split(' ')
const SELECTED = listItemVariants({ selected: true }).split(' ')

// `ruby` and `math` are inline-level too, though their computed display doesn't say so.
const INLINE_LEVEL = /^(?:inline|ruby|math)\b/

const STUCK = new Set(['sticky', 'fixed', 'absolute'])

let inertDocument: Document | null = null

// Copying these would style and lay out a whole page on the step's first frame; layout is clean before commit, so boxes are cheap to read.
function outOfView(viewport: HTMLElement | null) {
  const out = new Set<Element>()
  const scrolled = new Map<Element, Scrolled>()
  if (!viewport) return { out, scrolled, anchor: null }
  const view = viewport.getBoundingClientRect()
  const found: { first: Anchor | null; across: Anchor | null } = {
    first: null,
    across: null
  }
  // Out-of-flow boxes, and what's in them, don't move with the page's flow, so can't line it up.
  const visit = (parent: Element, anchoring: boolean) => {
    for (const child of parent.children) {
      const box = child.getBoundingClientRect()
      // A display: contents box has no size of its own, so its children say.
      if (box.width === 0 && box.height === 0) visit(child, anchoring)
      else if (box.bottom < view.top || box.top > view.bottom) {
        const { display } = getComputedStyle(child)
        // A box in place of inline content reflows its line, moving what shows; blocks inside an inline still go.
        if (display === 'inline') visit(child, false)
        else if (!INLINE_LEVEL.test(display)) out.add(child)
      } else {
        const { scrollTop: top, scrollLeft: left } = child
        if (top || left) scrolled.set(child, { element: child, top, left })
        const anchors =
          anchoring &&
          !found.first &&
          !STUCK.has(getComputedStyle(child).position)
        if (anchors) {
          const anchor = { element: child, top: box.top - view.top }
          if (box.top >= view.top) found.first = anchor
          else found.across = anchor
        }
        visit(child, anchors)
      }
    }
  }
  visit(viewport, true)
  return { out, scrolled, anchor: found.first ?? found.across }
}

const viewportOf = (pane: Element) =>
  pane.querySelector<HTMLElement>('[data-slot="pane-viewport"]')

// An inert document: nothing upgrades or loads; ids, names and form owners are stripped.
function ghostOf(pane: HTMLElement) {
  inertDocument ??= document.implementation.createHTMLDocument('')
  const ghost = inertDocument.importNode(pane, true)
  for (const name of ['data-stack', 'data-reached', 'data-stack-position']) {
    ghost.removeAttribute(name)
  }
  const { out: hidden, scrolled, anchor } = outOfView(viewportOf(pane))
  let anchorCopy: Anchor | null = null
  const scrolledCopies: Scrolled[] = []
  const originals = pane.querySelectorAll('*')
  const copies = ghost.querySelectorAll('*')
  const live: [Element, Element][] = []
  copies.forEach((copy, index) => {
    for (const { name } of Array.from(copy.attributes)) {
      if (
        name.startsWith('on') ||
        name === 'id' ||
        name === 'name' ||
        name === 'form'
      ) {
        copy.removeAttribute(name)
      }
    }
    const original = originals[index]
    if (anchor && original === anchor.element)
      anchorCopy = { element: copy, top: anchor.top }
    const scroll = original && scrolled.get(original)
    if (scroll) scrolledCopies.push({ ...scroll, element: copy })
    if (original && (isLive(copy) || hidden.has(original)))
      live.push([original, copy])
    else if (copy.localName === 'script') copy.remove()
  })
  for (const [original, copy] of live) {
    if (!ghost.contains(copy)) continue
    copy.replaceWith(standIn(original, copy))
  }
  return { ghost, anchor: anchorCopy, scrolled: scrolledCopies }
}

// A live tag would load once connected; others keep theirs, so tag rules like Prose's margins hold.
function emptyCopy(copy: Element) {
  if (!isLive(copy)) return copy.cloneNode(false) as HTMLElement
  const div = copy.ownerDocument.createElement('div')
  div.setAttribute('class', copy.getAttribute('class') ?? '')
  div.setAttribute('style', copy.getAttribute('style') ?? '')
  return div
}

function standIn(original: Element, copy: Element) {
  const { width, height } = original.getBoundingClientRect()
  const display = getComputedStyle(original).display
  const stand = emptyCopy(copy)
  stand.style.display = display === 'inline' ? 'inline-block' : display
  stand.style.width = `${width}px`
  stand.style.height = `${height}px`
  return stand
}

/** Swaps a `List.Item` row to its selected look. */
export function markCurrent(row: Element) {
  row.classList.remove(...UNSELECTED)
  row.classList.add(...SELECTED)
  row.setAttribute('aria-current', 'page')
}

function selectPicked(
  ghost: HTMLElement,
  secondary: NavigatorActiveSecondary,
  value: string | undefined
) {
  const picked = secondaryRows(secondary, undefined)
    .flatMap((group) => group.rows)
    .findIndex((row) => isActiveValue(row.value, value))
  if (picked === -1) return
  for (const list of ghost.querySelectorAll(
    '[data-slot="navigator-secondary-items"]'
  )) {
    if (list.getAttribute('data-navigator-items') !== secondary.value) continue
    const row = list.querySelectorAll('[data-slot="list-item"]')[picked]
    if (row) markCurrent(row)
  }
}

// A class: `getSnapshotBeforeUpdate` is the one hook that runs before React replaces the page.
export class NavigatorPageStep extends Component<NavigatorPageStepProps> {
  static displayName = 'NavigatorPageStep'

  private host = createRef<HTMLDivElement>()
  private finish: (() => void) | null = null

  getSnapshotBeforeUpdate(previous: NavigatorPageStepProps): Snapshot {
    const { secondary, value, at, level } = this.props
    if (
      secondary === null ||
      previous.secondary?.value !== secondary.value ||
      previous.at === null ||
      at === null ||
      previous.at === at ||
      prefersReducedMotion()
    ) {
      return null
    }
    const host = this.host.current
    const top = host?.parentElement?.querySelector<HTMLElement>(
      `[data-stack][data-level="${level}"][data-stack-position="top"]`
    )
    // Columns lay panes out in flow; only a stacked pane slides.
    if (!host || !top || getComputedStyle(top).position !== 'absolute') {
      return null
    }
    const from =
      this.finish === null
        ? null
        : {
            ghost: getComputedStyle(top).translate,
            pane: getComputedStyle(host).translate
          }
    const { ghost, anchor, scrolled } = ghostOf(top)
    if (at === 'child') selectPicked(ghost, secondary, value)
    return {
      step: at === 'child' ? 'push' : 'pop',
      ghost,
      anchor,
      scrolled,
      scrollTop: viewportOf(top)?.scrollTop ?? 0,
      from
    }
  }

  componentDidUpdate(
    previous: NavigatorPageStepProps,
    _state: unknown,
    snapshot: Snapshot
  ) {
    const { secondary, at } = this.props
    if (at === null || previous.secondary?.value !== secondary?.value) {
      this.finish?.()
    }
    const host = this.host.current
    const row = host?.parentElement
    if (!snapshot || !host || !row) return
    this.finish?.()
    host.append(snapshot.ghost)
    const viewport = viewportOf(snapshot.ghost)
    if (viewport) viewport.scrollTop = snapshot.scrollTop
    for (const { element, top, left } of snapshot.scrolled) {
      element.scrollTop = top
      element.scrollLeft = left
    }
    // A stand-in can't carry margins its children collapsed through it, so line the copy up by what shows.
    const anchor = snapshot.anchor
    if (viewport && anchor && snapshot.ghost.contains(anchor.element)) {
      viewport.scrollTop +=
        anchor.element.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top -
        anchor.top
    }
    const from = snapshot.from
    if (from?.ghost) row.style.setProperty(GHOST_FROM, from.ghost)
    if (from?.pane) row.style.setProperty(PANE_FROM, from.pane)
    row.setAttribute('data-page-step', snapshot.step)
    const finish = () => {
      if (this.finish !== finish) return
      this.finish = null
      host.replaceChildren()
      row.removeAttribute('data-page-step')
      row.style.removeProperty(GHOST_FROM)
      row.style.removeProperty(PANE_FROM)
    }
    this.finish = finish
    const running =
      typeof host.getAnimations === 'function' ? host.getAnimations() : []
    if (running.length === 0) finish()
    else void Promise.allSettled(running.map((a) => a.finished)).then(finish)
  }

  componentWillUnmount() {
    this.finish?.()
  }

  render() {
    return (
      <div
        ref={this.host}
        data-slot='navigator-page-ghost'
        className='pointer-events-none grid'
        aria-hidden
        inert
      />
    )
  }
}
