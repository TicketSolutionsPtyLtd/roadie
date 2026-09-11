import { Children, Fragment, type ReactNode, isValidElement } from 'react'

import { NavigatorItem } from './NavigatorItem'
import { navigatorPrimaryListVariants } from './variants'

/**
 * Wraps each run of consecutive `Navigator.Item`s in a `<ul>`; anything else
 * passes through as a sibling. Matches by element identity.
 */
export function wrapPrimaryRun(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  let run: ReactNode[] = []

  const flush = () => {
    if (run.length === 0) return
    const items = run
    run = []
    out.push(
      <ul key={`run-${out.length}`} className={navigatorPrimaryListVariants()}>
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
