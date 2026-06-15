'use client'

import { DialogBackdrop } from './DialogBackdrop'
import { DialogPopup, type DialogPopupProps } from './DialogPopup'
import { DialogPortal } from './DialogPortal'
import { DialogViewport } from './DialogViewport'

export type DialogContentProps = DialogPopupProps

export function DialogContent({ children, ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogViewport>
        <DialogPopup {...props}>{children}</DialogPopup>
      </DialogViewport>
    </DialogPortal>
  )
}

DialogContent.displayName = 'Dialog.Content'
