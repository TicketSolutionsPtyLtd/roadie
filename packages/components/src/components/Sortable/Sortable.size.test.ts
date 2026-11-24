import { expect, it } from 'vitest'

import budget from '../../../size-budget.json'

it("keeps the Move menu out of a sortable list's first load", () => {
  const { full, initial } = budget['./sortable']
  // Base UI's menu is about 39 kB of brotli, none of it loaded with the list.
  expect(full - initial).toBeGreaterThan(30_000)
})
