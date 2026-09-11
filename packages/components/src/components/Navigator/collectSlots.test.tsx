import { describe, expect, it } from 'vitest'

import { Navigator } from '.'
import { collectSlots } from './collectSlots'

const values = (slots: { value: string }[]) => slots.map((s) => s.value)

describe('collectSlots', () => {
  it('defaults every item to automatic placement and priority', () => {
    const { automatic } = collectSlots(
      <Navigator.Item value='/a'>A</Navigator.Item>
    )
    expect(automatic[0]).toMatchObject({
      placement: 'automatic',
      priority: 'automatic'
    })
  })

  it("lets an item's priority win over its group's, and inherits otherwise", () => {
    const { automatic } = collectSlots(
      <Navigator.Group visibilityPriority='low'>
        <Navigator.Item value='/a'>A</Navigator.Item>
        <Navigator.Item value='/b' visibilityPriority='high'>
          B
        </Navigator.Item>
      </Navigator.Group>
    )
    expect(automatic.map((s) => s.priority)).toEqual(['low', 'high'])
  })

  it('moves a pinned item and a pinned group into the pinned region', () => {
    const result = collectSlots([
      <Navigator.Item key='a' value='/a'>
        A
      </Navigator.Item>,
      <Navigator.Item key='account' value='account' placement='pinned'>
        Account
      </Navigator.Item>,
      <Navigator.Group key='help' placement='pinned'>
        <Navigator.Item value='/help'>Help</Navigator.Item>
      </Navigator.Group>
    ])
    expect(values(result.automatic)).toEqual(['/a'])
    expect(values(result.pinnedSlots)).toEqual(['account', '/help'])
    expect(result.pinned.map((entry) => entry.kind)).toEqual(['item', 'group'])
    expect(result.pinnedSlots[1]).toMatchObject({ placement: 'pinned' })
  })

  it("keeps an item in its group's placement and reports the conflict", () => {
    const result = collectSlots(
      <Navigator.Group>
        <Navigator.Item value='/a' placement='pinned'>
          A
        </Navigator.Item>
      </Navigator.Group>
    )
    expect(values(result.automatic)).toEqual(['/a'])
    expect(result.conflictingPlacement).toEqual(['/a'])
  })

  it('notices a pinned entry written before the cluster', () => {
    const me = (
      <Navigator.Item key='me' value='/me' placement='pinned'>
        Me
      </Navigator.Item>
    )
    const a = (
      <Navigator.Item key='a' value='/a'>
        A
      </Navigator.Item>
    )
    const first = collectSlots([me, a])
    const last = collectSlots([a, me])
    expect(first.pinnedBeforeCluster).toBe(true)
    expect(last.pinnedBeforeCluster).toBe(false)
  })

  it('collects Brand without counting it as a destination', () => {
    const result = collectSlots([
      <Navigator.Brand key='brand'>Logo</Navigator.Brand>,
      <Navigator.Item key='a' value='/a'>
        A
      </Navigator.Item>
    ])
    expect(result.brand).toHaveLength(1)
    expect(values(result.automatic)).toEqual(['/a'])
  })

  it('flags a child it cannot recognise', () => {
    expect(collectSlots(<div />).hasStrayChild).toBe(true)
  })

  it('records the group title on each slot for the More pane', () => {
    const { automatic } = collectSlots(
      <Navigator.Group>
        <Navigator.GroupTitle>Docs</Navigator.GroupTitle>
        <Navigator.Item value='/a'>A</Navigator.Item>
      </Navigator.Group>
    )
    expect(automatic[0]?.group?.title).toBe('Docs')
  })

  it('places ExpandToggle by its placement without making it a destination', () => {
    const result = collectSlots([
      <Navigator.Item key='a' value='/a'>
        A
      </Navigator.Item>,
      <Navigator.ExpandToggle key='toggle' placement='pinned' />
    ])
    expect(result.pinned.map((entry) => entry.kind)).toEqual(['toggle'])
    expect(result.pinnedSlots).toEqual([])
  })
})
