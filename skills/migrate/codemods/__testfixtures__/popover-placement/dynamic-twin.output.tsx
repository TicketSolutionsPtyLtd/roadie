import { Popover } from '@oztix/roadie-components/popover'

export function Info({ side, ...rest }: { side?: 'top' | 'bottom' }) {
  return (
    <Popover>
      <Popover.Content side={side ?? 'bottom'}>
        Doors open at 7pm
      </Popover.Content>
      <Popover.Content {...rest} positionerProps={{ align: 'start' }}>
        Doors open at 7pm
      </Popover.Content>
    </Popover>
  );
}
