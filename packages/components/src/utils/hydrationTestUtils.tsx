import { type ReactElement, type ReactNode, useEffect } from 'react'

import { type Root, hydrateRoot } from 'react-dom/client'

type Shot = Map<Element, { label: string; box: DOMRect }>

/** What a fixture that shifts today may shift at one width, and its ticket. */
export type Allowance = { ticket: string; shift: number; removed?: number }

/** A fixture: a component with no props, and any allowance by width. */
export type Fixture = (() => ReactNode) & {
  allowance?: Partial<Record<number, Allowance>>
}

/** `fixture`, allowed to shift as much as it does today until its ticket lands. */
export const allowing = (
  fixture: () => ReactNode,
  allowance: Fixture['allowance']
): Fixture => Object.assign(fixture, { allowance })

// Measured: 38 compositions never went more than two frames between changes.
const QUIET_FRAMES = 3
const ROUNDS = 20
// An allowance this much over what's measured is out of date: lower it.
const SLACK = 0.2

const hasBox = ({ width, height }: DOMRect) => width >= 1 && height >= 1
const tenths = (value: number) => Math.round(value * 10) / 10
const endless = (animation: Animation) =>
  animation.effect?.getComputedTiming().endTime === Infinity

// A paused or endless animation never finishes, so neither is waited for.
const ends = (animation: Animation) =>
  animation.playState === 'running' && !endless(animation)

/** The first place `now` differs from `was`, for a message. */
function firstChange(was: string, now: string) {
  let at = 0
  while (was[at] === now[at]) at++
  return now.slice(Math.max(0, at - 40), at + 40)
}

/** `work`, or an error saying what's stuck once it takes 5s. */
async function within(work: Promise<unknown>, stuck: () => string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<never>((_, fail) => {
    // A bound on the wait, cleared once it ends, so a stuck image is named.
    // eslint-disable-next-line roadie/no-fixed-sleep
    timer = setTimeout(() => fail(new Error(stuck())), 5000)
  })
  try {
    await Promise.race([work, late])
  } finally {
    clearTimeout(timer)
  }
}

/** Resolves once images, transitions and the DOM have all stopped changing. */
async function settle(host: HTMLElement) {
  for (let round = 0, html = ''; html !== host.innerHTML; round++) {
    if (round === ROUNDS)
      throw new Error(
        `Still changing after ${ROUNDS} rounds: ${firstChange(html, host.innerHTML)}`
      )
    html = host.innerHTML
    const images = [...host.querySelectorAll('img')]
    const easing = host.getAnimations({ subtree: true }).filter(ends)
    const loads = images.map((image) => image.decode())
    await within(
      Promise.allSettled([...loads, ...easing.map((a) => a.finished)]),
      () =>
        `Still loading: ${images.filter((i) => !i.complete).map((i) => i.src)}`
    )
    for (let frame = 0; frame < QUIET_FRAMES; frame++)
      await new Promise(requestAnimationFrame)
  }
}

function measure(host: HTMLElement): Shot {
  // An endless animation is read at its start, as the server's paint shows it.
  for (const animation of host.getAnimations({ subtree: true }))
    if (endless(animation)) animation.currentTime = 0
  const origin = host.getBoundingClientRect()
  const seen = new Map<string, number>()
  const shot: Shot = new Map()
  const inside = host.querySelectorAll(':scope > *, [data-slot]')
  for (const element of [host, ...inside]) {
    const slot =
      element.getAttribute('data-slot') ?? (element === host ? 'host' : 'root')
    const nth = seen.get(slot) ?? 0
    seen.set(slot, nth + 1)
    const { x, y, width, height } = element.getBoundingClientRect()
    shot.set(element, {
      label: nth === 0 ? slot : `${slot}#${nth}`,
      box: new DOMRect(x - origin.x, y - origin.y, width, height)
    })
  }
  return shot
}

function shifts(server: Shot, hydrated: Shot, allowance?: Allowance) {
  const found: string[] = []
  const removed: string[] = []
  let largest = 0
  // The host counts from nothing, as content that grows from nothing pushes.
  const [host] = server.keys()
  for (const [element, { label, box }] of server) {
    const counts = (rect: DOMRect) => element === host || hasBox(rect)
    if (!counts(box)) continue
    const now = hydrated.get(element)?.box
    if (!now || !counts(now)) {
      removed.push(`${label} was removed`)
      continue
    }
    for (const [verb, by] of [
      ['moved', [now.x - box.x, now.y - box.y]],
      ['resized', [now.width - box.width, now.height - box.height]]
    ] as const) {
      const most = Math.max(...by.map(Math.abs))
      if (most < 1) continue
      largest = Math.max(largest, most)
      if (!allowance || most > allowance.shift)
        found.push(`${label} ${verb} ${by.map(tenths).join(', ')}`)
    }
  }
  if (!allowance) return [...found, ...removed]
  const { ticket, shift, removed: allowed = 0 } = allowance
  if (removed.length > allowed) found.push(...removed)
  if (largest < shift * (1 - SLACK))
    found.push(`${ticket}: shifts ${tenths(largest)}px, so lower its allowance`)
  if (removed.length < allowed * (1 - SLACK))
    found.push(`${ticket}: removes ${removed.length}, so lower its allowance`)
  return found
}

function Hydrated(props: { children: ReactNode; onHydrated: () => void }) {
  const { onHydrated } = props
  useEffect(() => onHydrated(), [onHydrated])
  return props.children
}

/**
 * Hydrates `ui` over its server `html` and resolves each slot with a box that
 * moved or resized by 1px or more or was removed, and each error React
 * reported. With an `allowance`, resolves only what goes past it, or a line
 * asking to lower it once the shift falls well under it.
 */
export async function hydrationShift(
  html: string,
  ui: ReactElement,
  allowance?: Allowance
) {
  const errors: string[] = []
  const report = (...args: unknown[]) => errors.push(args.map(String).join(' '))
  const consoleError = console.error
  const host = document.createElement('div')
  document.body.append(host)
  let root: Root | undefined
  try {
    // A fragment, so inline scripts run as they do in a served page.
    host.append(document.createRange().createContextualFragment(html))
    // Every face settles first, so a late font can't pass for a shift.
    await Promise.allSettled([...document.fonts].map((face) => face.load()))
    await settle(host)
    const server = measure(host)
    console.error = report
    await new Promise<void>((onHydrated, fail) => {
      const onRecoverableError = (error: unknown) => report('Recovered', error)
      // After the first commit `fail` does nothing, so the error is kept too.
      const onUncaughtError = (error: unknown) => {
        report('Uncaught', error)
        fail(error)
      }
      const tree = <Hydrated onHydrated={onHydrated}>{ui}</Hydrated>
      root = hydrateRoot(host, tree, { onRecoverableError, onUncaughtError })
    })
    await settle(host)
    return [...errors, ...shifts(server, measure(host), allowance)]
  } finally {
    console.error = consoleError
    root?.unmount()
    host.remove()
  }
}
