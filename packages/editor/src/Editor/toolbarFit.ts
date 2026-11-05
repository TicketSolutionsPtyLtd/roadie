/**
 * What each of the docked bar's items is to the fit: the block type `lead`
 * and `undo` always show, `redo` only when everything does, and the rest
 * show in order while they fit.
 */
export type ToolbarSlot = 'lead' | 'item' | 'separator' | 'undo' | 'redo'

type FitOptions = {
  slots: readonly ToolbarSlot[]
  /** Each slot's width, margins included. */
  widths: readonly number[]
  /** What the bar takes besides the slots: its padding and its own buttons, less one gap. */
  base: number
  gap: number
  /** The More button's width. */
  more: number
  available: number
}

/** The slots that fit beside More, in order, or null when every one fits without it. */
export function fitToolbar({
  slots,
  widths,
  base,
  gap,
  more,
  available
}: FitOptions): ReadonlySet<number> | null {
  const cost = (slot: number) => (widths[slot] ?? 0) + gap
  const all = slots.map((_, slot) => slot)
  const total = (chosen: readonly number[]) =>
    chosen.reduce((sum, slot) => sum + cost(slot), base)
  if (total(all) <= available) return null

  const undo = slots.indexOf('undo')
  const kept = new Set(
    all.filter(
      (slot) =>
        slots[slot] === 'lead' ||
        slot === undo ||
        (slot === undo - 1 && slots[slot] === 'separator')
    )
  )
  let room = available - total([...kept]) - more - gap
  for (const slot of all) {
    if (kept.has(slot) || slots[slot] === 'redo') continue
    if (cost(slot) > room) break
    kept.add(slot)
    room -= cost(slot)
  }
  return new Set(withoutStraySeparators(all, kept, slots))
}

/** Keeps a separator only between two shown items. */
function withoutStraySeparators(
  all: readonly number[],
  kept: ReadonlySet<number>,
  slots: readonly ToolbarSlot[]
) {
  const shown: number[] = []
  for (const slot of all.filter((each) => kept.has(each))) {
    const last = shown.at(-1)
    const isSeparator = slots[slot] === 'separator'
    if (isSeparator && (last === undefined || slots[last] === 'separator'))
      continue
    shown.push(slot)
  }
  while (shown.length > 0 && slots[shown.at(-1)!] === 'separator') shown.pop()
  return shown
}
