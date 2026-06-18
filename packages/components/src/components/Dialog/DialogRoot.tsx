'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { type DialogRole, DialogRoleContext } from './DialogContext'

export type DialogRootProps = DialogPrimitive.Root.Props & {
  /**
   * `'alertdialog'` raises the dialog to the `z-alert` tier so it stacks
   * above an open modal or drawer.
   * @default 'dialog'
   */
  role?: DialogRole
}

export function DialogRoot({ role = 'dialog', ...props }: DialogRootProps) {
  return (
    <DialogRoleContext.Provider value={role}>
      <DialogPrimitive.Root {...props} />
    </DialogRoleContext.Provider>
  )
}

DialogRoot.displayName = 'Dialog.Root'
