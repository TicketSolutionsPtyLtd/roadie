import { type ReactNode, useEffect, useRef } from 'react'

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
  label?: ReactNode
  icon?: ReactNode
}

export function searchSlotMeta({
  placement = 'pinned',
  label = SEARCH_LABEL,
  // eslint-disable-next-line roadie/phosphor-icon-weight -- presentNavIcon sets it
  icon = <MagnifyingGlassIcon />
}: NavigatorSearchSlotProps): NavigatorSlotMeta {
  return {
    value: SEARCH_VALUE,
    label,
    icon,
    topValue: SEARCH_VALUE,
    descendants: [],
    placement,
    priority: 'automatic',
    search: true
  }
}

const isSearchEntry = (entry: CollectedSlots['cluster'][number]) =>
  entry.kind === 'item' && entry.slot.search === true

/** What the navigation shows without a palette to open: everything but Search. */
export function withoutSearch(collected: CollectedSlots): CollectedSlots {
  if (!collected.ordered.some((slot) => slot.search)) return collected
  const keep = (slot: NavigatorSlotMeta) => !slot.search
  return {
    ...collected,
    search: [],
    cluster: collected.cluster.filter((entry) => !isSearchEntry(entry)),
    automatic: collected.automatic.filter(keep),
    pinnedSlots: collected.pinnedSlots.filter(keep),
    ordered: collected.ordered.filter(keep)
  }
}

// A microtask past the commit, so a palette mounted after Navigator registers first.
export function useMissingPaletteWarning(
  declared: boolean,
  palette: RegisteredPalette | null
) {
  const warned = useRef(false)
  useEffect(() => {
    if (!declared || palette || !isDev()) return
    let live = true
    queueMicrotask(() => {
      if (live && !currentPalette() && !warned.current) {
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
}
