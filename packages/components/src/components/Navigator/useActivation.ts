'use client'

import { type MouseEvent, use, useCallback } from 'react'

import { NavigatorActionsContext } from './NavigatorContext'
import {
  type ActivationSlot,
  type ActivationState,
  type ActivationStep,
  type ActivationSurface,
  resolveActivation
} from './activation'
import { opensElsewhere } from './opensElsewhere'

export function useActivation(palette: { open: () => void } | null = null) {
  const {
    activateItem,
    setOverflowOpen,
    closeOverflowOnRoute,
    setValue,
    setOpenMenu,
    setPinExpanded,
    setNavCollapsed,
    scrollActivePaneToTop,
    onShowListChange
  } = use(NavigatorActionsContext)
  return useCallback(
    (
      event: MouseEvent,
      surface: ActivationSurface,
      slot: ActivationSlot,
      state: Omit<ActivationState, 'elsewhere'> = {}
    ) => {
      const apply = (step: ActivationStep) => {
        switch (step.kind) {
          case 'openPalette':
            return palette?.open()
          case 'activate':
            return activateItem(step.value)
          case 'closeMenu':
            return setOpenMenu(null)
          case 'preventDefault':
            return event.preventDefault()
          case 'closeMore':
            return setOverflowOpen(false)
          case 'closeMoreOnRoute':
            return closeOverflowOnRoute()
          case 'setValue':
            return setValue(step.value)
          case 'expandBar':
            setPinExpanded(true)
            return setNavCollapsed(false)
          case 'scrollToTop':
            return scrollActivePaneToTop()
          case 'showList':
            return onShowListChange?.(step.show)
        }
      }
      const elsewhere = opensElsewhere(event)
      resolveActivation(surface, slot, { ...state, elsewhere }).forEach(apply)
    },
    [
      palette,
      activateItem,
      setOverflowOpen,
      closeOverflowOnRoute,
      setValue,
      setOpenMenu,
      setPinExpanded,
      setNavCollapsed,
      scrollActivePaneToTop,
      onShowListChange
    ]
  )
}
