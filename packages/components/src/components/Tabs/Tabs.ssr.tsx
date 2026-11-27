import { Tabs } from '.'

export const SecondTabActive = () => (
  <Tabs defaultValue='lineup'>
    <Tabs.List>
      <Tabs.Tab value='details'>Details</Tabs.Tab>
      <Tabs.Tab value='lineup'>Lineup</Tabs.Tab>
      <Tabs.Indicator />
    </Tabs.List>
    <Tabs.Panel value='details'>Doors open at 7pm.</Tabs.Panel>
    <Tabs.Panel value='lineup'>Custard, then Regurgitator.</Tabs.Panel>
  </Tabs>
)
