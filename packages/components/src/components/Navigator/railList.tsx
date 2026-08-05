import { Children, Fragment, type ReactNode, isValidElement } from 'react'

import { NavigatorItem } from './NavigatorItem'
import { navigatorRailListVariants } from './variants'

/**
 * Turns a run of rail children into valid list markup: consecutive
 * `Navigator.Item`s become one `<ul>` of `<li>`s, and anything else — Brand,
 * End, Group (which emits its own title + list) — passes through as a sibling.
 *
 * A `<nav>` may hold several lists, so a group's list and a loose run's list
 * sit side by side rather than one nesting inside the other.
 *
 * Matches by element identity: author the tree in a client component.
 */
export function wrapRailRun(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  let run: ReactNode[] = []

  const flush = () => {
    if (run.length === 0) return
    const items = run
    run = []
    out.push(
      <ul key={`run-${out.length}`} className={navigatorRailListVariants()}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === NavigatorItem) {
      run.push(child)
      return
    }
    flush()
    out.push(<Fragment key={`slot-${out.length}`}>{child}</Fragment>)
  })
  flush()

  return out
}
