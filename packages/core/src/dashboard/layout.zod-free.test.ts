import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('dashboard layout stays zod-free', () => {
  it('never imports zod or the schema module', () => {
    const source = readFileSync(new URL('./layout.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/from ['"]zod['"]/)
    expect(source).not.toMatch(/from ['"]\.\/schema['"]/)
  })
})
