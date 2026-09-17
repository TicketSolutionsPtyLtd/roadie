import type { MouseEvent } from 'react'

export type LinkClick = Pick<
  MouseEvent<HTMLElement>,
  | 'altKey'
  | 'button'
  | 'ctrlKey'
  | 'currentTarget'
  | 'defaultPrevented'
  | 'metaKey'
  | 'shiftKey'
>

/** Whether an anchor click should navigate in its current browsing context. */
export function isPlainLinkClick(event: LinkClick): boolean {
  const document = event.currentTarget.ownerDocument
  const linkTarget =
    event.currentTarget.getAttribute('target') ??
    document.querySelector('base[target]')?.getAttribute('target')
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (linkTarget === null ||
      linkTarget === undefined ||
      linkTarget === '' ||
      linkTarget.toLowerCase() === '_self') &&
    !event.currentTarget.hasAttribute('download')
  )
}
