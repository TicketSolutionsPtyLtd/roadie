import { Accordion } from '.'

export const OneOpen = () => (
  <Accordion>
    <Accordion.Item open>
      <Accordion.Trigger>When do doors open?</Accordion.Trigger>
      <Accordion.Content>Doors at 7pm, band at 9pm.</Accordion.Content>
    </Accordion.Item>
    <Accordion.Item>
      <Accordion.Trigger>Is it all ages?</Accordion.Trigger>
      <Accordion.Content>Over 18s only, with photo ID.</Accordion.Content>
    </Accordion.Item>
  </Accordion>
)
