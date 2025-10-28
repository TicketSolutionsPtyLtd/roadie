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
      strong: {
        color: 'colorPalette.fg.strong',
        fontWeight: 'black'
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
