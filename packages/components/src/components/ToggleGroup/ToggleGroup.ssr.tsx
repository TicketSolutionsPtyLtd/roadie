import { ToggleGroup } from '.'

export const OnePressed = () => (
  <ToggleGroup aria-label='Date range' defaultValue={['30d']}>
    <ToggleGroup.Item value='7d'>7 days</ToggleGroup.Item>
    <ToggleGroup.Item value='30d'>30 days</ToggleGroup.Item>
    <ToggleGroup.Item value='90d'>90 days</ToggleGroup.Item>
  </ToggleGroup>
)
