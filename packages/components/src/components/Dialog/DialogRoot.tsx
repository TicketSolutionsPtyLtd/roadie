'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import type { OverlayEmphasis } from '../../variants'
import {
  DialogEmphasisContext,
  type DialogRole,
  DialogRoleContext
} from './DialogContext'

export type DialogRootProps = DialogPrimitive.Root.Props & {
  /**
   * `'alertdialog'` raises the dialog to the `z-alert` tier so it stacks
   * above an open modal or drawer.
   * @default 'dialog'
   */
  role?: DialogRole
  /**
   * How much the dialog takes over the page behind it.
   * @default 'normal'
   */
  emphasis?: OverlayEmphasis
}

export function DialogRoot({
  role = 'dialog',
  emphasis = 'normal',
  ...props
}: DialogRootProps) {
  return (
    <DialogRoleContext.Provider value={role}>
      <DialogEmphasisContext value={emphasis}>
        <DialogPrimitive.Root {...props} />
      </DialogEmphasisContext>
    </DialogRoleContext.Provider>
  )
}

DialogRoot.displayName = 'Dialog.Root'
