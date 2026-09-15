import { describe, expect, it } from 'vitest'

import { Navigator } from '.'
import { collectSlots } from './collectSlots'

const values = (slots: { value: string }[]) => slots.map((s) => s.value)

describe('collectSlots', () => {
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
})
