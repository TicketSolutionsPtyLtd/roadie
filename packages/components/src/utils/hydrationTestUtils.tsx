import { type ReactElement, type ReactNode, useEffect } from 'react'

import { type Root, hydrateRoot } from 'react-dom/client'

type Shot = Map<Element, { label: string; box: DOMRect }>

// One more than the audit's 38 fixtures needed: each had settled within two.
const SETTLE_FRAMES = 3

const hasBox = ({ width, height }: DOMRect) => width >= 1 && height >= 1
const tenths = (value: number) => Math.round(value * 10) / 10

/** `frames` frames, then any transition they started; never an endless one. */
async function settle(host: HTMLElement, frames: number) {
  for (let frame = 0; frame < frames; frame++)
    await new Promise(requestAnimationFrame)
  await Promise.all(
    host
      .getAnimations({ subtree: true })
      .filter(({ effect }) => effect?.getComputedTiming().endTime !== Infinity)
      .map((animation) => animation.finished.catch(() => {}))
  )
}

function measure(host: HTMLElement): Shot {
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

function shifts(server: Shot, hydrated: Shot) {
  const found: string[] = []
  for (const [element, { label, box }] of server) {
    if (!hasBox(box)) continue
    const now = hydrated.get(element)?.box
    if (!now || !hasBox(now)) {
      found.push(`${label} was removed`)
      continue
    }
    for (const [verb, by] of [
      ['moved', [now.x - box.x, now.y - box.y]],
      ['resized', [now.width - box.width, now.height - box.height]]
    ] as const)
      if (by.some((delta) => Math.abs(delta) >= 1))
        found.push(`${label} ${verb} ${by.map(tenths).join(', ')}`)
  }
  return found
}

function Hydrated(props: { children: ReactNode; onHydrated: () => void }) {
  const { onHydrated } = props
  useEffect(() => onHydrated(), [onHydrated])
  return props.children
}

/**
 * Hydrates `ui` over its server `html` and resolves each slot with a box that
 * moved or resized by 1px or more or was removed, and each error React reported.
 */
export async function hydrationShift(html: string, ui: ReactElement) {
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
    await settle(host, 1)
    const server = measure(host)
    console.error = report
    await new Promise<void>((onHydrated, onUncaughtError) => {
      const onRecoverableError = (error: unknown) => report('Recovered', error)
      const tree = <Hydrated onHydrated={onHydrated}>{ui}</Hydrated>
      root = hydrateRoot(host, tree, { onRecoverableError, onUncaughtError })
    })
    await settle(host, SETTLE_FRAMES)
    return [...errors, ...shifts(server, measure(host))]
  } finally {
    console.error = consoleError
    root?.unmount()
    host.remove()
  }
}
