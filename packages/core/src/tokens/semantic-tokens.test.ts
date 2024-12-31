import { describe, expect, it } from 'vitest'

import { semanticTokens } from '../index'

describe('semantic tokens', () => {
  it('has colors with expected structure', () => {
    expect(semanticTokens.colors).toBeDefined()
    expect(semanticTokens.colors.$type).toBe('color')
    expect(semanticTokens.colors.$extensions).toBeDefined()
    expect(semanticTokens.colors.$extensions.modes).toEqual(['light', 'dark'])
    expect(semanticTokens.colors.neutral).toBeDefined()
    expect(semanticTokens.colors.neutral.$type).toBe('color')
    expect(semanticTokens.colors.neutral.$description).toBeDefined()
    expect(semanticTokens.colors.neutral['1'].$value).toBeDefined()
    expect(semanticTokens.colors.neutral['12'].$value).toBeDefined()
    expect(semanticTokens.colors.neutral['A1'].$value).toBeDefined()
    expect(semanticTokens.colors.neutral['A12'].$value).toBeDefined()
  })

  it('has neutral dark colors with expected structure', () => {
    expect(semanticTokens.colors.neutralDark).toBeDefined()
    expect(semanticTokens.colors.neutralDark.$type).toBe('color')
    expect(semanticTokens.colors.neutralDark.$description).toBeDefined()
    expect(semanticTokens.colors.neutralDark['1'].$value).toBeDefined()
    expect(semanticTokens.colors.neutralDark['12'].$value).toBeDefined()
    expect(semanticTokens.colors.neutralDark['A1'].$value).toBeDefined()
    expect(semanticTokens.colors.neutralDark['A12'].$value).toBeDefined()
  })
})
