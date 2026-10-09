import { Button as RoadieButton } from '@oztix/roadie-components/button';
import { Badge } from '@oztix/roadie-components';

function Button() {
  return <button type='button'>Local</button>
}

export function Row() {
  return (
    <>
      <Badge>New</Badge>
      <Button />
      <RoadieButton href='/events'>All events</RoadieButton>
    </>
  );
}
