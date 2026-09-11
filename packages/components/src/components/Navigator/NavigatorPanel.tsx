import type { ReactNode } from 'react'

export type NavigatorPanelProps = {
  /** Names the menu, e.g. 'Account'. Falls back to the item's own label. */
  'aria-label'?: string
  children?: ReactNode
  className?: string
}

/**
 * A menu owned by a `Navigator.Item` — an account switcher, a settings menu —
 * rather than a destination. Declaring one makes the item a **disclosure**:
 * any `href` on it is ignored, exactly as a `Navigator.Secondary` makes the
 * item a section.
 *
 * A popover anchored to the item's row on desktop; on phones the item's tab
 * toggles a full-screen `Pane`.
 *
 * A pane rather than a drawer below `md`: the item already has a tab, and a
 * tab that opens something reads as another tab, not an overlay appearing
 * over the bar. The pane carries no `Pane.Header` of its own — a tab root has
 * no Back — so selection reads on the tab (`aria-expanded`, `aria-current`)
 * rather than on a manufactured dismiss control. Dismissal is tapping another
 * tab, tapping this one again, or Escape.
 *
 * `Navigator.Panel` is declared inside `Navigator.Primary`, a different
 * subtree from the stack `Navigator.Content` orchestrates. Its content isn't
 * portalled there — a portal only relocates DOM, not the React context a
 * pane's stack registration depends on. Instead `Navigator.Primary` publishes
 * every declared panel's meta (tab, folded, or in `Navigator.End` alike) onto
 * `NavigatorContext`, and `Navigator.Content` renders the open one's pane
 * itself, reading that meta by value — the same seam it already uses for the
 * generated overflow fallback.
 *
 * Below `md`, `children` render inside the pane, whose list unwind reaches
 * direct children only — put `List` at this panel's top level, not inside a
 * wrapper, or its inset lands one level off.
 *
 * Renders nothing itself — its parents read it by reference and present it. So
 * author the tree in a client component: Flight replaces the type of every
 * element authored in a server component with a `React.lazy` wrapper. See
 * COMPOUND_PATTERNS.md §1.2.
 */
export function NavigatorPanel(_props: NavigatorPanelProps): null {
  return null
}

NavigatorPanel.displayName = 'Navigator.Panel'
