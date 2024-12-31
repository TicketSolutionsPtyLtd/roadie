import { describe, expect, it } from 'vitest'

import { pandaTokens } from '../index'

describe('panda tokens', () => {
  it('has tokens with expected structure', () => {
    expect(pandaTokens.tokens).toBeDefined()
    expect(pandaTokens.tokens.blurs).toBeDefined()
    expect(pandaTokens.tokens.breakpoints).toBeDefined()
    expect(pandaTokens.tokens.colors).toBeDefined()
  })

  it('has semantic tokens with expected structure', () => {
    expect(pandaTokens.semanticTokens).toBeDefined()
    expect(pandaTokens.semanticTokens.colors).toBeDefined()
  })
})
