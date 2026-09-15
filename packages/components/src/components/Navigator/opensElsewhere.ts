import type { MouseEvent } from 'react'

/** A modified or non-primary click on a link, which the browser opens in a new tab or window. */
export const opensElsewhere = (event: MouseEvent) =>
  event.currentTarget instanceof HTMLAnchorElement &&
  (event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey)
