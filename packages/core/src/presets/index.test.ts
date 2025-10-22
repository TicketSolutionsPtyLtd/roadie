import { describe, expect, it } from 'vitest'

import { roadie } from './index'

// Simple type definitions for font rules
interface FontRule {
  fontStyle: string
  fontDisplay?: string
  fontWeight: string
  src: string | string[]
  unicodeRange: string
}

describe('roadie preset', () => {
  describe('basic configuration', () => {
    it('has the correct name', () => {
      expect(roadie.name).toBe('roadie')
    })

    it('has theme configuration', () => {
      const theme = roadie.theme!
      expect(theme).toBeDefined()
      expect(theme.breakpoints).toBeDefined()
      expect(theme.tokens).toBeDefined()
      expect(theme.semanticTokens).toBeDefined()
      expect(theme.textStyles).toBeDefined()
    })

    it('has responsive breakpoints', () => {
      const { breakpoints } = roadie.theme!
      expect(breakpoints).toHaveProperty('sm')
      expect(breakpoints).toHaveProperty('md')
      expect(breakpoints).toHaveProperty('lg')
      expect(breakpoints).toHaveProperty('xl')
      expect(breakpoints).toHaveProperty('2xl')
    })

    it('has semantic tokens', () => {
      const { semanticTokens } = roadie.theme!
      expect(semanticTokens?.colors).toBeDefined()
      expect(semanticTokens?.shadows).toBeDefined()
      expect(semanticTokens?.sizes).toBeDefined()
    })
  })

  describe('global CSS', () => {
    const globalCss = roadie.globalCss!

    describe('resets', () => {
      it('has box sizing reset', () => {
        expect(globalCss['*, *::before, *::after']).toEqual({
          boxSizing: 'border-box'
        })
      })

      it('has base reset', () => {
        expect(globalCss['*']).toEqual({
          margin: 0,
          padding: 0
        })
      })
    })

    describe('focus styles', () => {
      it('has focus-visible styles', () => {
        expect(globalCss[':focus-visible']).toEqual({
          outlineWidth: '2px',
          outlineStyle: 'solid',
          outlineColor: 'accent.border.strong',
          outlineOffset: '2px'
        })
      })
    })

    describe('typography', () => {
      it('has body styles', () => {
        expect(globalCss.body).toEqual({
          lineHeight: 1.5,
          WebkitFontSmoothing: 'antialiased',
          backgroundColor: 'neutral.surface',
          borderColor: 'neutral.border',
          color: 'neutral.fg',
          colorPalette: 'neutral',
          fontFamily: 'ui'
        })
      })

      it('has heading styles', () => {
        expect(globalCss['h1, h2, h3, h4, h5, h6']).toEqual({
          textWrap: 'balance'
        })
      })

      it('has paragraph styles', () => {
        expect(globalCss.p).toEqual({
          textWrap: 'pretty'
        })
      })

      it('has code styles', () => {
        expect(globalCss['code, pre']).toEqual({
          fontFamily: 'mono'
        })
      })
    })

    describe('media elements', () => {
      it('has media styles', () => {
        expect(globalCss['img, picture, video, canvas, svg']).toEqual({
          display: 'block',
          maxWidth: '100%'
        })
      })
    })

    describe('form elements', () => {
      it('has form element styles', () => {
        expect(globalCss['input, button, textarea, select']).toEqual({
          font: 'inherit'
        })
      })
    })

    describe('links', () => {
      it('has link styles', () => {
        expect(globalCss.a).toEqual({
          textDecoration: 'none',
          color: 'currentColor',
          _visited: {
            color: 'inherit'
          }
        })
      })
    })

    describe('root elements', () => {
      it('has root styles', () => {
        expect(globalCss['#root, #__next']).toEqual({
          isolation: 'isolate'
        })
      })
    })
  })

  describe('font configuration', () => {
    const globalFontface = roadie.globalFontface!

    it('has Intermission font configuration', () => {
      const intermissionFont = globalFontface.Intermission as FontRule[]
      expect(Array.isArray(intermissionFont)).toBe(true)
      expect(intermissionFont).toHaveLength(2)

      // Type assertion to ensure array has elements
      expect(intermissionFont[0]).toBeDefined()
      expect(intermissionFont[1]).toBeDefined()

      const normal = intermissionFont[0]!
      const italic = intermissionFont[1]!

      expect(normal.fontStyle).toBe('normal')
      expect(normal.fontWeight).toBe('100 900')
      expect(normal.src).toContain('Intermission.woff')

      expect(italic.fontStyle).toBe('italic')
      expect(italic.fontWeight).toBe('100 900')
      expect(italic.src).toContain('Intermission-Italic.woff')
    })

    it('has IBMPlexMono font configuration', () => {
      const monoFont = globalFontface.IBMPlexMono as FontRule
      expect(monoFont).toBeDefined()
      expect(monoFont.fontStyle).toBe('normal')
      expect(monoFont.fontWeight).toBe('400')
      expect(Array.isArray(monoFont.src)).toBe(true)
      expect(monoFont.src[0]).toContain('latin-400-normal.woff2')
    })

    it('has correct unicode range for IBMPlexMono', () => {
      const expectedRange =
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

      const monoFont = globalFontface.IBMPlexMono as FontRule
      expect(monoFont.unicodeRange).toBe(expectedRange)
    })
  })
})
