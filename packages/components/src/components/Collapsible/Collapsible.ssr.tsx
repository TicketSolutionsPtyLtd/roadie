import { Collapsible } from '.'

export const ClampedText = () => (
  <Collapsible className='max-w-md'>
    <Collapsible.Text lines={2}>
      Standing entry to Ember Galah Ball at Iguana Teapot Hall in Fitzroy. Doors
      open at 7pm and the band starts at 9pm. The venue is all ages until 10pm,
      then over 18s only, and photo ID is checked at the door for every ticket.
    </Collapsible.Text>
  </Collapsible>
)

const panel = (defaultOpen: boolean) => () => (
  <Collapsible defaultOpen={defaultOpen}>
    <Collapsible.Trigger>Show all ticket types</Collapsible.Trigger>
    <Collapsible.Panel>
      <p>General admission, $68.00</p>
      <p>VIP, $120.00</p>
    </Collapsible.Panel>
  </Collapsible>
)

export const PanelOpen = panel(true)
export const PanelClosed = panel(false)
