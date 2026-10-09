import { Button as RoadieButton } from '@oztix/roadie-components/button'
import { LinkButton } from '@oztix/roadie-components/link-button'

export function Actions() {
  return (
    <>
      <RoadieButton>Cancel</RoadieButton>
      <LinkButton href='/checkout'>Checkout</LinkButton>
    </>
  )
}
