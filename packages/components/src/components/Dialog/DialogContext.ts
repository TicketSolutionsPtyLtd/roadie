'use client'

import { createContext, use } from 'react'

import type { OverlayEmphasis } from '../../variants'

export type DialogRole = 'dialog' | 'alertdialog'

export const DialogRoleContext = createContext<DialogRole>('dialog')

export function useDialogRole() {
  return use(DialogRoleContext)
}

export const DialogEmphasisContext = createContext<OverlayEmphasis>('normal')

export function useDialogEmphasis() {
  return use(DialogEmphasisContext)
}
