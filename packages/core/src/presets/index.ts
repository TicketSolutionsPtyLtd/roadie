import {
  defineGlobalFontface,
  defineGlobalStyles,
  definePreset,
  defineSemanticTokens,
  defineTextStyles,
  defineTokens
} from '@pandacss/dev'

import { pandaTokens } from '../index.ts'

const { breakpoints = {}, ...tokens } = pandaTokens?.tokens
const { textStyles = {}, ...semanticTokens } = pandaTokens?.semanticTokens

export const roadie = definePreset({
  name: 'roadie',
  theme: {
    breakpoints,
    tokens: defineTokens(tokens),
    semanticTokens: defineSemanticTokens(semanticTokens),
    textStyles: defineTextStyles(textStyles)
  },
  globalCss: defineGlobalStyles({
    '*, *::before, *::after': {
      boxSizing: 'border-box'
    },
    '*': {
      margin: 0,
      padding: 0,
      fontSize: '100%',
      font: 'inherit'
    },
    ':focus-visible': {
      outline: '2px solid',
      outlineColor: 'border.focused',
      outlineOffset: '2px'
    },
    body: {
      lineHeight: 1.5,
      WebkitFontSmoothing: 'antialiased',
      fontFamily: 'ui',
      color: 'fg',
      backgroundColor: 'bg'
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
  }),
  globalFontface: defineGlobalFontface({
    'Inter Variable': [
      {
        fontStyle: 'normal',
        fontDisplay: 'swap',
        fontWeight: '100 900',
        src: 'url(https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2) format("woff2-variations")',
        unicodeRange:
          'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
      },
      {
        fontStyle: 'italic',
        fontDisplay: 'swap',
        fontWeight: '100 900',
        src: 'url(https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-italic.woff2) format("woff2-variations")',
        unicodeRange:
          'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
      }
    ],
    'IBM Plex Mono': {
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
  })
})
