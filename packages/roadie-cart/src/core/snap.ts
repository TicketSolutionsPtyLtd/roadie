export interface DecideSnapTargetArgs {
  /** Drag velocity.y in px/s. Negative = moving up, positive = moving down. */
  velocity: number
  /** Drag offset in px from the position at drag start. Negative = moved up, positive = moved down. */
  offset: number
  /** Drawer state at the start of the drag. */
  currentState: 'open' | 'closed'
  /** Drawer y-position when closed (larger — drawer is near bottom of expanded range). */
  closedY: number
  /** Drawer y-position when open (smaller — drawer is near top). Invariant: openY <= closedY. */
  openY: number
}

/**
 * Pure decision for which snap target a drag-end should fall to. Browser Y
 * increases downward, so for a bottom drawer an upward flick has negative
 * velocity (open) and a downward flick has positive velocity (close).
 *
 * Rules (strict `<` / `>` on the velocity thresholds — exactly ±500 falls
 * through to the positional check):
 *   velocity < -500 → 'open'
 *   velocity > +500 → 'closed'
 *   otherwise       → closer side by midpoint; exact midpoint keeps state.
 */
export function decideSnapTarget(
  args: DecideSnapTargetArgs
): 'open' | 'closed' {
  const { velocity, offset, currentState, closedY, openY } = args

  if (velocity < -500) return 'open'
  if (velocity > 500) return 'closed'

  const startY = currentState === 'closed' ? closedY : openY
  const currentY = startY + offset
  const midpoint = (openY + closedY) / 2

  if (currentY < midpoint) return 'open'
  if (currentY > midpoint) return 'closed'
  return currentState
}
