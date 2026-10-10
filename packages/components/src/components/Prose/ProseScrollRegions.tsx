'use client'

import { useEffect } from 'react'

import {
  PROSE_ID_ATTRIBUTE,
  observeProseScrollRegions
} from '../ScrollRegion/scrollRegion'

/**
 * Prose's client half. It renders nothing, so it can't disturb Prose's
 * layout, and finds its Prose by id because a root with
 * `dangerouslySetInnerHTML` can't hold a child.
 */
export function ProseScrollRegions({
  proseId,
  wrapBare
}: {
  proseId: string
  wrapBare: boolean
}) {
  useEffect(() => {
    const prose = document.querySelector<HTMLElement>(
      `[${PROSE_ID_ATTRIBUTE}="${CSS.escape(proseId)}"]`
    )
    return prose ? observeProseScrollRegions(prose, wrapBare) : undefined
  }, [proseId, wrapBare])
  return null
}
