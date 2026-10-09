import { Popover } from '@oztix/roadie-components/popover'

const placement = { side: 'top' as const }

export const info = (
  <Popover>
    <Popover.Content positionerProps={placement}>Doors open at 7pm</Popover.Content>
    <Popover.Content positionerProps={{ ...placement, sideOffset: 4 }}>
      Doors open at 7pm
    </Popover.Content>
  </Popover>
)
