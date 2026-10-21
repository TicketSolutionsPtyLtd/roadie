import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement
} from 'react'

import { Tabs } from '@oztix/roadie-components/tabs'

type PanelProps = { value: string; label: string; children: ReactNode }

function IndexPanel({ value, children }: PanelProps) {
  return (
    <Tabs.Panel value={value} className='min-w-0 pt-2'>
      {children}
    </Tabs.Panel>
  )
}

/** One tab per search index, each panel holding that index's MDX. */
function IndexTabs({ children }: { children: ReactNode }) {
  const panels = Children.toArray(children).filter(
    (child): child is ReactElement<PanelProps> => isValidElement(child)
  )
  return (
    <Tabs data-slot='index-tabs' defaultValue={panels[0]?.props.value}>
      <Tabs.List data-not-prose>
        {panels.map(({ props: { value, label } }) => (
          <Tabs.Tab key={value} value={value}>
            {label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator />
      </Tabs.List>
      {panels}
    </Tabs>
  )
}

IndexTabs.Panel = IndexPanel

export { IndexTabs }
