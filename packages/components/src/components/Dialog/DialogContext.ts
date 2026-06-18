'use client'

import { createContext, use } from 'react'

export type DialogRole = 'dialog' | 'alertdialog'

export const DialogRoleContext = createContext<DialogRole>('dialog')

export function useDialogRole() {
  return use(DialogRoleContext)
}
