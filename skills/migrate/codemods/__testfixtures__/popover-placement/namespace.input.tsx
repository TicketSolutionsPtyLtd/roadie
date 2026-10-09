import * as Roadie from '@oztix/roadie-components'
import * as Other from './other'

export const info = (
  <Roadie.Popover>
    <Roadie.Popover.Content positionerProps={{ side: 'top', sideOffset: 4 }}>
      Doors open at 7pm
    </Roadie.Popover.Content>
    <Other.Popover.Content positionerProps={{ side: 'top' }} />
  </Roadie.Popover>
)

export function Shadowed(Roadie: any) {
  return (
    <Roadie.Popover.Content positionerProps={{ side: 'top' }}>
      <Roadie.IconButton aria-label='Close' size='icon-sm' />
      <Roadie.Card as='section'>Card</Roadie.Card>
    </Roadie.Popover.Content>
  )
}
