import { Button as RoadieButton } from '@oztix/roadie-components/button'

export function Actions() {
  return (
    <>
      <RoadieButton>Cancel</RoadieButton>
      <RoadieButton href='/checkout'>Checkout</RoadieButton>
    </>
  );
}
