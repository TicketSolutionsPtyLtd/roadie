import { describe, expect, it } from 'vitest'

import { getContrastColor } from './contrast'

describe('getContrastColor', () => {
  it('returns white for black background', () => {
    expect(getContrastColor('#000000')).toBe('white')
  })

  it('returns black for white background', () => {
    expect(getContrastColor('#ffffff')).toBe('black')
  })

  it('returns black for Oztix Blue (bright enough for dark text)', () => {
    expect(getContrastColor('#0091EB')).toBe('black')
  })

  it('returns black for light yellow', () => {
    expect(getContrastColor('#FFFF00')).toBe('black')
  })

  it('returns white for dark red', () => {
    expect(getContrastColor('#8B0000')).toBe('white')
  })

  it('returns black for light gray', () => {
    expect(getContrastColor('#CCCCCC')).toBe('black')
  })

  it('returns white for dark gray', () => {
    expect(getContrastColor('#333333')).toBe('white')
  })
})
