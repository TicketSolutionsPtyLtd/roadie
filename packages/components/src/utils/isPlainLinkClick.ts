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
  const link = event.currentTarget
  const target =
    link.getAttribute('target') ??
    link.ownerDocument.querySelector<HTMLBaseElement>('base[target]')?.target
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !(
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (target && target.toLowerCase() !== '_self') ||
      link.hasAttribute('download')
    )
  )
}
