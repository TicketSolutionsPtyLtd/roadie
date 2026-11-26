'use client'

import { type MouseEvent, use, useCallback } from 'react'

import { NavigatorActionsContext } from './NavigatorContext'
import {
  type ActivationSlot,
  type ActivationState,
  type ActivationSurface,
  resolveActivation
} from './activation'
import { opensElsewhere } from './opensElsewhere'

export function useActivation() {
  const { activateItem, setOverflowOpen, closeOverflowOnRoute, setValue } = use(
    NavigatorActionsContext
  )
  return useCallback(
    (
      event: MouseEvent,
      surface: ActivationSurface,
      slot: ActivationSlot,
      state: Omit<ActivationState, 'elsewhere'> = {}
    ) => {
      const elsewhere = opensElsewhere(event)
      for (const step of resolveActivation(surface, slot, {
        ...state,
        elsewhere
      })) {
        if (step.kind === 'activate') activateItem(step.value)
        else if (step.kind === 'closeMore') setOverflowOpen(false)
        else if (step.kind === 'closeMoreOnRoute') closeOverflowOnRoute()
        else setValue(step.value)
      }
    },
    [activateItem, setOverflowOpen, closeOverflowOnRoute, setValue]
  )
}
