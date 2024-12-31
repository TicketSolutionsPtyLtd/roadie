import { describe, expect, it } from 'vitest'

import { tokens } from '../index'

describe('design tokens', () => {
  it('has blurs with expected structure', () => {
    expect(tokens.blurs).toBeDefined()
    expect(tokens.blurs.$type).toBe('blur')
    expect(tokens.blurs.$description).toBeDefined()
    expect(tokens.blurs.sm.$value).toBeDefined()
    expect(tokens.blurs.base.$value).toBeDefined()
    expect(tokens.blurs.md.$value).toBeDefined()
    expect(tokens.blurs.lg.$value).toBeDefined()
    expect(tokens.blurs.xl.$value).toBeDefined()
    expect(tokens.blurs['2xl'].$value).toBeDefined()
    expect(tokens.blurs['3xl'].$value).toBeDefined()
  })

  it('has breakpoints with expected structure', () => {
    expect(tokens.breakpoints).toBeDefined()
    expect(tokens.breakpoints.$type).toBe('breakpoint')
    expect(tokens.breakpoints.$description).toBeDefined()
    expect(tokens.breakpoints.sm.$value).toBeDefined()
    expect(tokens.breakpoints.md.$value).toBeDefined()
    expect(tokens.breakpoints.lg.$value).toBeDefined()
    expect(tokens.breakpoints.xl.$value).toBeDefined()
    expect(tokens.breakpoints['2xl'].$value).toBeDefined()
  })

  it('has colors with expected structure', () => {
    expect(tokens.colors).toBeDefined()
    expect(tokens.colors.$type).toBe('color')
    expect(tokens.colors.neutralSlate).toBeDefined()
    expect(tokens.colors.neutralSlate.$description).toBeDefined()
    expect(tokens.colors.neutralSlate['1'].$value).toBeDefined()
    expect(tokens.colors.neutralSlate['12'].$value).toBeDefined()
    expect(tokens.colors.neutralSlate['A1'].$value).toBeDefined()
    expect(tokens.colors.neutralSlate['A12'].$value).toBeDefined()
  })
})
