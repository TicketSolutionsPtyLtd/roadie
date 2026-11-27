import { Steps } from '.'

export const FirstStep = () => (
  <Steps count={2}>
    <Steps.List>
      <Steps.Item index={0}>
        <Steps.Trigger>
          <Steps.Indicator>1</Steps.Indicator>
          <Steps.TriggerText>Details</Steps.TriggerText>
        </Steps.Trigger>
        <Steps.Separator />
      </Steps.Item>
      <Steps.Item index={1}>
        <Steps.Trigger>
          <Steps.Indicator>2</Steps.Indicator>
          <Steps.TriggerText>Review</Steps.TriggerText>
        </Steps.Trigger>
      </Steps.Item>
    </Steps.List>
    <Steps.Content index={0}>Enter your details.</Steps.Content>
    <Steps.Content index={1}>Check your order.</Steps.Content>
  </Steps>
)
