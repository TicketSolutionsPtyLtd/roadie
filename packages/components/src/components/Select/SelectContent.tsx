'use client'

import { SelectPopup, type SelectPopupProps } from './SelectPopup'
import { SelectPortal } from './SelectPortal'
import { SelectPositioner } from './SelectPositioner'

export type SelectContentProps = SelectPopupProps

export function SelectContent({ children, ...props }: SelectContentProps) {
  return (
    <SelectPortal>
      <SelectPositioner>
        <SelectPopup {...props}>{children}</SelectPopup>
      </SelectPositioner>
    </SelectPortal>
  )
}

SelectContent.displayName = 'Select.Content'
