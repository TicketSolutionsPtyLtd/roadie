import type { ComponentProps } from 'react'

import { Button } from './Button'

export const IconButton = (props: ComponentProps<typeof Button>) => {
  return <Button px='0' py='0' _icon={{ fontSize: '1.2em' }} {...props} />
}

IconButton.displayName = 'IconButton'
