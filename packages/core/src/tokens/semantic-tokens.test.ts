import { describe, expect, it } from 'vitest'

import semanticTokens from './semantic-tokens.json'

type SemanticToken = {
  $type: string
  $description?: string
  $value?: string
  $extensions?: {
    mode?: {
      light: string
      dark: string
    }
  }
}

describe('semantic tokens', () => {
  it('has colors with expected structure', () => {
    expect(semanticTokens.colors).toBeDefined()
    expect((semanticTokens.colors as SemanticToken).$type).toBe('color')
    expect(semanticTokens.colors.neutral).toBeDefined()
    expect((semanticTokens.colors.neutral as SemanticToken).$type).toBe('color')
    expect(semanticTokens.colors.neutral.surface).toBeDefined()
    expect(semanticTokens.colors.neutral.border).toBeDefined()
    expect(semanticTokens.colors.neutral.fg).toBeDefined()
  })

  it('has color states with expected structure', () => {
    const surface = semanticTokens.colors.neutral.surface
    expect(surface.default).toBeDefined()
    expect((surface.default as SemanticToken).$type).toBe('color')
    expect((surface.default as SemanticToken).$value).toBeDefined()
    expect((surface.default as SemanticToken).$extensions?.mode).toBeDefined()
    expect(surface.hover).toBeDefined()
    expect(surface.active).toBeDefined()
  })

  it('has color modes configured correctly', () => {
    const defaultState = semanticTokens.colors.neutral.surface
      .default as SemanticToken
    expect(defaultState.$extensions?.mode?.light).toBeDefined()
    expect(defaultState.$extensions?.mode?.dark).toBeDefined()
  })
})
