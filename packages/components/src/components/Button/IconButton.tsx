import type { ComponentProps } from 'react'

import { Button } from './Button'

export interface IconButtonProps
  extends Omit<ComponentProps<typeof Button>, 'aria-label'> {
  'aria-label': string
}

export const IconButton = (props: IconButtonProps) => {
  return <Button px='0' py='0' _icon={{ fontSize: '1.2em' }} {...props} />
}

IconButton.displayName = 'IconButton'
