'use client'

import { type ReactNode, use } from 'react'

import { CaretUpIcon } from '@phosphor-icons/react'

import { PaneContext } from './PaneContext'
import { paneTitleCompactVariants } from './variants'

// The header's compact echo of whichever title the pane has. Shared by both
// arrangements — `Pane.Title` emits it beside its own heading, `Pane.Header`
// emits it from context for a content-placed `Pane.BodyTitle` — so the two
// can never drift in label, tab order or motion.
//
// Not exported from `index.tsx`: it is the internals of a title, not a slot a
// consumer places.
export function PaneTitleCompact({ children }: { children: ReactNode }) {
  const pane = use(PaneContext)
  if (!pane) return null

  return (
    <button
      type='button'
      data-slot='pane-title-compact'
      aria-label='Scroll to top'
      // Invisible while expanded, so it must not be reachable either — but
      // the button itself stays out of aria-hidden: that would bury its own
      // tap target along with the decorative text underneath it.
      tabIndex={pane.collapsed ? undefined : -1}
      onClick={pane.scrollToTop}
      // `cursor-pointer` alone, not `is-interactive`: that utility's
      // `:active` also sets the CSS `transform` property to `scale(0.99)`,
      // which composes with this element's own independent `scale` property
      // (the expand/collapse cross-fade) instead of replacing it, and adds a
      // second, unrelated transition list on top of the one already here.
      className={paneTitleCompactVariants({ collapsed: pane.collapsed })}
    >
      {/* No `flex-1`: it would grow the text to fill the row and push the
          caret out to the far edge, away from the title it belongs to. Flex
          items shrink by default, so `min-w-0 truncate` still clips a long
          title without it. */}
      <span aria-hidden className='min-w-0 truncate'>
        {children}
      </span>
      {/* Large screens only, per the request — a small hint that this echo
          scrolls back up, not a label: the button's own aria-label already
          says so. */}
      <CaretUpIcon
        aria-hidden
        weight='bold'
        className='hidden size-3 shrink-0 text-subtle lg:inline-block'
      />
    </button>
  )
}
