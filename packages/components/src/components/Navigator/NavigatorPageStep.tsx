'use client'

import { Component, createRef } from 'react'

import { listItemVariants } from '../List/variants'
import { type NavigatorActiveSection, isActiveValue } from './NavigatorContext'
import { sectionRows } from './sectionData'

/** Where a page-root section stands: its own route, a sub-page on top, or neither. */
export type NavigatorPageAt = 'root' | 'child' | null

type NavigatorPageStepProps = {
  section: NavigatorActiveSection | null
  value: string | undefined
  at: NavigatorPageAt
  level: number
}

type Snapshot = {
  step: 'push' | 'pop'
  ghost: HTMLElement
  scrollTop: number
} | null

const EMBEDS = 'iframe, video, audio, object, embed'
const UNSELECTED = listItemVariants({ selected: false }).split(' ')
const SELECTED = listItemVariants({ selected: true }).split(' ')

// A look-alike, never a second live copy: no ids or form names to collide
// with the real page, no embeds to load again, and out of the stack's counts.
function ghostOf(pane: HTMLElement) {
  const ghost = pane.cloneNode(true) as HTMLElement
  for (const name of ['data-stack', 'data-current', 'data-stack-position']) {
    ghost.removeAttribute(name)
  }
  for (const node of ghost.querySelectorAll('[id]')) node.removeAttribute('id')
  for (const node of ghost.querySelectorAll('[name]')) {
    node.removeAttribute('name')
  }
  for (const node of ghost.querySelectorAll<HTMLElement>(EMBEDS)) {
    const stand = document.createElement('div')
    stand.className = node.className
    stand.style.cssText = node.style.cssText
    node.replaceWith(stand)
  }
  return ghost
}

// The list pane's row turns current as it slides away; so does the page's.
function selectPicked(
  ghost: HTMLElement,
  section: NavigatorActiveSection,
  value: string | undefined
) {
  const picked = sectionRows(section, undefined)
    .flatMap((group) => group.rows)
    .findIndex((row) => isActiveValue(row.value, value))
  if (picked === -1) return
  for (const list of ghost.querySelectorAll(
    '[data-slot="navigator-section-items"]'
  )) {
    if (list.getAttribute('data-navigator-items') !== section.value) continue
    const row = list.querySelectorAll('[data-slot="list-item"]')[picked]
    if (!row) continue
    row.classList.remove(...UNSELECTED)
    row.classList.add(...SELECTED)
    row.setAttribute('aria-current', 'page')
  }
}

const viewportOf = (pane: HTMLElement) =>
  pane.querySelector<HTMLElement>('[data-slot="pane-viewport"]')

// A page-root section's route and sub-pages share one pane, so a move between
// them moves no pane: the page as it was stands in, cloned before React replaces
// it. A class, as `getSnapshotBeforeUpdate` is the one hook that runs that early.
export class NavigatorPageStep extends Component<NavigatorPageStepProps> {
  static displayName = 'NavigatorPageStep'

  private host = createRef<HTMLDivElement>()
  private finish: (() => void) | null = null

  getSnapshotBeforeUpdate(previous: NavigatorPageStepProps): Snapshot {
    const { section, value, at, level } = this.props
    if (
      section === null ||
      previous.section?.value !== section.value ||
      previous.at === null ||
      at === null ||
      previous.at === at
    ) {
      return null
    }
    const top = this.host.current?.parentElement?.querySelector<HTMLElement>(
      `[data-stack][data-level="${level}"][data-stack-position="top"]`
    )
    if (!top) return null
    const ghost = ghostOf(top)
    if (at === 'child') selectPicked(ghost, section, value)
    return {
      step: at === 'child' ? 'push' : 'pop',
      ghost,
      scrollTop: viewportOf(top)?.scrollTop ?? 0
    }
  }

  componentDidUpdate(
    _previous: NavigatorPageStepProps,
    _state: unknown,
    snapshot: Snapshot
  ) {
    const host = this.host.current
    const row = host?.parentElement
    if (!snapshot || !host || !row) return
    this.finish?.()
    host.append(snapshot.ghost)
    const viewport = viewportOf(snapshot.ghost)
    if (viewport) viewport.scrollTop = snapshot.scrollTop
    row.setAttribute('data-page-step', snapshot.step)
    const finish = () => {
      if (this.finish !== finish) return
      this.finish = null
      host.replaceChildren()
      row.removeAttribute('data-page-step')
    }
    this.finish = finish
    // The sheet animates a stacked row with motion allowed; nothing else waits.
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
