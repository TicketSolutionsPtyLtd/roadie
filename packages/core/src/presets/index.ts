import { definePreset } from '@pandacss/dev'

import { pandaTokens } from '../index'
import { patterns } from '../patterns'
import { recipes } from '../recipes'

const { breakpoints = {}, ...tokens } = pandaTokens?.tokens ?? {}
const { textStyles = {}, ...semanticTokens } = pandaTokens?.semanticTokens ?? {}

export const roadie = definePreset({
  name: 'roadie',
  theme: {
    breakpoints,
    tokens,
    semanticTokens,
    recipes,
    textStyles
  },
  patterns,
  conditions: {
    dark: '[data-color-mode=dark] &',
    extend: {
      hoverFocusVisible:
        '&:is(:hover, [data-hover], :focus-visible, [data-focus-visible])'
    }
  },
  globalCss: {
    '*, *::before, *::after': {
      boxSizing: 'border-box'
    },
    '*': {
      margin: 0,
      padding: 0
    },
    ':root': {
      '--font-intermission': 'Intermission',
      '--font-ibm-plex-mono': 'IBMPlexMono'
    },
    ':focus-visible': {
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineColor: 'accent.border.strong',
      outlineOffset: '2px'
    },
    '::selection': {
      backgroundColor: 'information.surface'
    },
    body: {
      lineHeight: 1.5,
      WebkitFontSmoothing: 'antialiased',
      fontFamily: 'ui',
      color: 'neutral.fg',
      backgroundColor: 'neutral.surface',
      borderColor: 'neutral.border',
      colorPalette: 'neutral'
    },
    'img, picture, video, canvas, svg': {
      display: 'block',
      maxWidth: '100%'
    },
    'input, button, textarea, select': {
      font: 'inherit'
    },
    'p, h1, h2, h3, h4, h5, h6': {
      overflowWrap: 'break-word'
    },
    p: {
      textWrap: 'pretty'
    },
    'h1, h2, h3, h4, h5, h6': {
      textWrap: 'balance'
    },
    a: {
      textDecoration: 'none',
      color: 'currentColor',
      _visited: {
        color: 'inherit'
      }
    },
    'code, pre': {
      fontFamily: 'mono'
    },
    '#root, #__next': {
      isolation: 'isolate'
    }
  },
  globalFontface: {
    Intermission: [
      {
        fontStyle: 'normal',
        fontDisplay: 'swap',
        fontWeight: '100 900',
        src: 'url(https://assets.oztix.com.au/file/a676ef0f-099f-4383-8db8-a93b7c404af6=Intermission.woff) format("woff2")'
      },
      {
        fontStyle: 'italic',
        fontDisplay: 'swap',
        fontWeight: '100 900',
        src: 'url(https://assets.oztix.com.au/file/097e749a-a48c-4882-8987-065175facf7d=Intermission-Italic.woff) format("woff2")'
      }
    ],
    IBMPlexMono: {
      fontStyle: 'normal',
      fontDisplay: 'swap',
      fontWeight: '400',
      src: [
        'url(https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-400-normal.woff2) format("woff2")',
        'url(https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-400-normal.woff) format("woff")'
      ],
      unicodeRange:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
    }
  }
})
