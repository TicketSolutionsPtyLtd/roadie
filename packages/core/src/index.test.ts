import { describe, expect, it } from 'vitest'

import { pandaTokens, semanticTokens, tokens } from './index'

describe('core exports', () => {
  describe('panda tokens', () => {
    it('exports panda tokens', () => {
      expect(pandaTokens).toBeDefined()
      expect(pandaTokens.tokens).toBeDefined()
      expect(pandaTokens.semanticTokens).toBeDefined()
    })

    it('has correct token structure', () => {
      const { tokens: baseTokens } = pandaTokens
      expect(baseTokens.colors).toBeDefined()
      expect(baseTokens.blurs).toBeDefined()
      expect(baseTokens.breakpoints).toBeDefined()
      expect(baseTokens.spacing).toBeDefined()
      expect(baseTokens.radii).toBeDefined()
    })

    it('has correct semantic token structure', () => {
      const { semanticTokens: semTokens } = pandaTokens
      expect(semTokens.colors).toBeDefined()
      expect(semTokens.shadows).toBeDefined()
    })
  })

  describe('semantic tokens', () => {
    it('exports semantic tokens', () => {
      expect(semanticTokens).toBeDefined()
    })

    it('has correct semantic token structure', () => {
      expect(semanticTokens.colors).toBeDefined()
      expect(semanticTokens.colors).toHaveProperty('$type', 'color')
      expect(semanticTokens.colors).toHaveProperty('neutral')
      expect(semanticTokens.colors).toHaveProperty('$extensions.modes')
    })

    it('has correct token values', () => {
      const colorTokens = semanticTokens.colors
      expect(colorTokens).toBeDefined()
      expect(colorTokens.neutral).toBeDefined()
      expect(colorTokens.neutral.surface).toBeDefined()
      expect(colorTokens.neutral.surface.default).toBeDefined()
      expect(colorTokens.neutral.surface.default.$value).toBeDefined()
    })

    it('has correct mode configuration', () => {
      expect(semanticTokens.colors.$extensions.modes).toContain('light')
      expect(semanticTokens.colors.$extensions.modes).toContain('dark')
    })
  })

  describe('design tokens', () => {
    it('exports design tokens', () => {
      expect(tokens).toBeDefined()
      expect(tokens.blurs).toBeDefined()
      expect(tokens.breakpoints).toBeDefined()
      expect(tokens.colors).toBeDefined()
    })

    it('has correct token structure', () => {
      expect(tokens.colors).toHaveProperty('$type', 'color')
      expect(tokens.breakpoints).toHaveProperty('$type', 'breakpoint')
      expect(tokens.blurs).toHaveProperty('$type', 'blur')
    })

    it('has correct token values', () => {
      expect(tokens.colors).toHaveProperty('neutralSlate')
      expect(tokens.colors).toHaveProperty('neutralSand')
      expect(tokens.breakpoints).toHaveProperty('sm')
      expect(tokens.breakpoints).toHaveProperty('md')
      expect(tokens.breakpoints).toHaveProperty('lg')
    })

    it('does not expose internal properties', () => {
      const hasInternalProps = Object.keys(tokens).some(
        (key) => key.startsWith('_') || key.startsWith('$internal')
      )
      expect(hasInternalProps).toBe(false)
    })
  })
})
