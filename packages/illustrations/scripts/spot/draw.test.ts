// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { drawSource } from './draw.ts'

describe('drawSource', () => {
  it.each(['../scripts/spot/new', '/etc/hosts', 'Letter-B'])(
    "refuses %s, which isn't the name of a drawing",
    async (name) => {
      await expect(drawSource(name)).rejects.toThrow('kebab-case')
    }
  )
})
