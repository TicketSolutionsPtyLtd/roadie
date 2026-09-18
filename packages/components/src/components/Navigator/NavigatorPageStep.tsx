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
  /** Where a reversed step picks up: the pane and the ghost as they were mid-slide. */
  from: { ghost: string; pane: string } | null
} | null

const GHOST_FROM = '--page-step-ghost-from'
const PANE_FROM = '--page-step-pane-from'

// Anything that runs code once connected, or draws what a copy can't.
const LIVE = new Set(['iframe', 'video', 'audio', 'object', 'embed', 'canvas'])
const isLive = (element: Element) =>
  LIVE.has(element.localName) || element.localName.includes('-')

const UNSELECTED = listItemVariants({ selected: false }).split(' ')
const SELECTED = listItemVariants({ selected: true }).split(' ')

let inertDocument: Document | null = null

// An inert document: nothing upgrades or loads; ids, names and form owners are stripped.
function ghostOf(pane: HTMLElement) {
  inertDocument ??= document.implementation.createHTMLDocument('')
  const ghost = inertDocument.importNode(pane, true)
  for (const name of ['data-stack', 'data-reached', 'data-stack-position']) {
    ghost.removeAttribute(name)
  }
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
    if (original && isLive(copy)) live.push([original, copy])
    else if (copy.localName === 'script') copy.remove()
  })
  for (const [original, copy] of live) {
    if (!ghost.contains(copy)) continue
    copy.replaceWith(standIn(original, copy))
  }
  return ghost
}

function standIn(original: Element, copy: Element) {
  const { width, height } = original.getBoundingClientRect()
  const display = getComputedStyle(original).display
  const stand = copy.ownerDocument.createElement('div')
  stand.setAttribute('class', copy.getAttribute('class') ?? '')
  stand.setAttribute('style', copy.getAttribute('style') ?? '')
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

const viewportOf = (pane: Element) =>
  pane.querySelector<HTMLElement>('[data-slot="pane-viewport"]')

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
    const ghost = ghostOf(top)
    if (at === 'child') selectPicked(ghost, secondary, value)
    return {
      step: at === 'child' ? 'push' : 'pop',
      ghost,
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
