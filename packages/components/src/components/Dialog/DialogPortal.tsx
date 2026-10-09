'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'

export type DialogPortalProps = DialogPrimitive.Portal.Props

export function DialogPortal(props: DialogPortalProps) {
  const scope = useAccentScopeProps(props.style)
  return <DialogPrimitive.Portal {...props} {...scope} />
}

DialogPortal.displayName = 'Dialog.Portal'
