import * as Roadie from '@oztix/roadie-components'
import * as Other from './other'

export const info = (
  <Roadie.Popover>
    <Roadie.Popover.Content side='top' sideOffset={4}>
      Doors open at 7pm
    </Roadie.Popover.Content>
    <Other.Popover.Content positionerProps={{ side: 'top' }} />
  </Roadie.Popover>
)
