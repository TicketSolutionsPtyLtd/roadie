import { type ReactNode, useEffect, useRef, useState } from 'react'

import { MagnifyingGlassIcon } from '@phosphor-icons/react'

import { isDev } from '../../utils/isDev'
import {
  type RegisteredPalette,
  currentPalette
} from '../CommandPalette/registry'
import type { CollectedSlots } from './collectSlots'
import type { NavigatorPlacement, NavigatorSlotMeta } from './mobileSlots'

// No route can start with `@@`, so it never matches the active value.
export const SEARCH_VALUE = '@@navigator-search'

export const SEARCH_LABEL = 'Search'

export type NavigatorSearchSlotProps = {
  placement?: NavigatorPlacement
  href?: string
  label?: ReactNode
  icon?: ReactNode
}

export function searchSlotMeta({
  placement = 'pinned',
  href,
  label = SEARCH_LABEL,
  // eslint-disable-next-line roadie/phosphor-icon-weight -- presentNavIcon sets it
  icon = <MagnifyingGlassIcon />
}: NavigatorSearchSlotProps): NavigatorSlotMeta {
  const value = href ?? SEARCH_VALUE
  return {
    value,
    label,
    icon,
    href,
    declaredHref: href,
    topValue: value,
    descendants: [],
    placement,
    priority: 'automatic',
    search: true
  }
}

/** A Search that opens the palette; one with an `href` routes like an item. */
export const opensPalette = (slot: NavigatorSlotMeta) =>
  slot.search === true && slot.href === undefined

const isSearchEntry = (entry: CollectedSlots['cluster'][number]) =>
  entry.kind === 'item' && opensPalette(entry.slot)

/** What the navigation shows without a palette to open: everything but a Search that needs one. */
export function withoutSearch(collected: CollectedSlots): CollectedSlots {
  if (!collected.ordered.some(opensPalette)) return collected
  const keep = (slot: NavigatorSlotMeta) => !opensPalette(slot)
  return {
    ...collected,
    search: collected.search.filter((entry) => !isSearchEntry(entry)),
    cluster: collected.cluster.filter((entry) => !isSearchEntry(entry)),
    automatic: collected.automatic.filter(keep),
    pinnedSlots: collected.pinnedSlots.filter(keep),
    ordered: collected.ordered.filter(keep)
  }
}

/**
 * Whether a declared Search has no palette to open, known only after mount:
 * the server and hydration lay Search out, so the bar doesn't jump once the
 * palette registers. A microtask past the commit, so a palette mounted after
 * Navigator registers first.
 */
export function usePaletteMissing(
  declared: boolean,
  palette: RegisteredPalette | null
) {
  const [missing, setMissing] = useState(false)
  if (palette && missing) setMissing(false)
  const warned = useRef(false)
  useEffect(() => {
    if (!declared || palette) return
    let live = true
    queueMicrotask(() => {
      if (!live || currentPalette()) return
      setMissing(true)
      if (isDev() && !warned.current) {
        warned.current = true
        console.warn(
          '[Roadie] Navigator.Search found no CommandPalette with a shortcut to open, so it renders nothing.'
        )
      }
    })
    return () => {
      live = false
    }
  }, [declared, palette])
  return missing
}
