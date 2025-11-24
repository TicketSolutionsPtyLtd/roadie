import { defineRecipe } from '@pandacss/dev'

export const headingRecipe = defineRecipe({
  className: 'heading',
  jsx: ['Heading'],
  base: {
    textStyle: 'display.ui',
    color: 'colorPalette.fg.strong',
    colorPalette: 'neutral'
  },
  variants: {
    emphasis: {
      default: {
        color: 'colorPalette.fg.strong'
      },
      highlight: {
        colorPalette: 'information',
        backgroundColor: 'colorPalette.surface.highlight',
        color: 'neutralSlate.13',
        px: '0.4em',
        py: '0.2em',
        alignSelf: 'flex-start',
        '&.color-palette_neutral': {
          color: 'neutral.fg.inverted'
        },
        '&::selection': {
          backgroundColor: 'colorPalette.surface.highlight.active'
        }
      },
      strong: {
        color: 'colorPalette.fg.strong',
        fontWeight: 'black !important'
      },
      subtle: {
        color: 'colorPalette.fg.subtle',
        fontWeight: 'medium'
      },
      subtler: {
        color: 'colorPalette.fg.subtler',
        fontWeight: 'normal'
      }
    }
  },
  defaultVariants: {
    emphasis: 'default'
  }
})

export const heading = headingRecipe
