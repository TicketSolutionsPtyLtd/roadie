import { Popover } from '@oztix/roadie-components/popover'

const offset = 8

export function Info({ boundary }: { boundary: HTMLElement }) {
  return (
    <Popover>
      <Popover.Trigger>Info</Popover.Trigger>
      <Popover.Content positionerProps={{ side: 'top', sideOffset: offset }}>
        Doors open at 7pm
      </Popover.Content>
      <Popover.Content
        align='start'
        positionerProps={{ align: 'end', alignOffset: 4, collisionBoundary: boundary }}
      >
        Doors open at 7pm
      </Popover.Content>
      <Popover.Content positionerProps={{ collisionBoundary: boundary }}>
        Doors open at 7pm
      </Popover.Content>
    </Popover>
  )
}
