import { defineRecipe } from '@pandacss/dev'

export const codeRecipe = defineRecipe({
  className: 'code',
  jsx: ['Code'],
  base: {
    color: 'colorPalette.fg',
    backgroundColor: 'colorPalette.surface.subtle',
    textStyle: 'code',
    px: '075',
    display: 'inline-flex',
    borderRadius: 'sm',
    border: '1px solid'
  },
  variants: {
    emphasis: {
      default: {
        borderColor: 'colorPalette.border',
        backgroundColor: 'colorPalette.surface.subtle'
      },
      strong: {
        color: 'colorPalette.fg.inverted',
        borderColor: 'colorPalette.border.strong',
        backgroundColor: 'colorPalette.surface.strong'
      },
      subtle: {
        borderColor: 'colorPalette.border.subtle'
      },
      subtler: {
        borderColor: 'transparent'
      }
    }
  },
  defaultVariants: {
    emphasis: 'default'
  }
})

export const code = codeRecipe
