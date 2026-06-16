'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

export type DialogRootProps = DialogPrimitive.Root.Props

export function DialogRoot(props: DialogRootProps) {
  return <DialogPrimitive.Root {...props} />
}

DialogRoot.displayName = 'Dialog.Root'
