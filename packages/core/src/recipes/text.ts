import { defineRecipe } from '@pandacss/dev'

export const textRecipe = defineRecipe({
  className: 'text',
  jsx: ['Text'],
  base: {
    textStyle: 'ui',
    color: 'colorPalette.fg'
  },
  variants: {
    emphasis: {
      default: {
        color: 'colorPalette.fg'
      },
      strong: {
        color: 'colorPalette.fg.strong',
        fontWeight: 'semibold'
      },
      subtle: {
        color: 'colorPalette.fg.subtle'
      },
      subtler: {
        color: 'colorPalette.fg.subtler'
      }
    },
    interactive: {
      true: {
        cursor: 'pointer',
        _hover: {
          color: 'colorPalette.fg.hover'
        },
        _focus: {
          color: 'colorPalette.fg.hover'
        },
        _active: {
          color: 'colorPalette.fg.active'
        },
        _groupHover: {
          color: 'colorPalette.fg.hover'
        },
        _groupFocus: {
          color: 'colorPalette.fg.hover'
        },
        _groupActive: {
          color: 'colorPalette.fg.active'
        }
      }
    }
  },
  defaultVariants: {
    emphasis: 'default',
    interactive: false
  }
})
