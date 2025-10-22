import { defineRecipe } from '@pandacss/dev'

export const buttonRecipe = defineRecipe({
  className: 'button',
  jsx: ['Button', 'IconButton'],
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 'full',
    fontWeight: 'bold',
    fontFamily: 'ui',
    cursor: 'pointer',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    transition: 'all 0.2s',
    color: 'colorPalette.fg',
    _hover: {
      color: 'colorPalette.fg.hover'
    },
    _active: {
      color: 'colorPalette.fg.active'
    },
    _disabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
      color: 'colorPalette.fg.subtle'
    },
    _focusVisible: {
      outlineColor: 'colorPalette.border.strong',
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineOffset: '2px'
    }
  },
  variants: {
    emphasis: {
      strong: {
        color: 'colorPalette.fg.inverted',
        backgroundColor: 'colorPalette.surface.strong',
        _hover: {
          color: 'colorPalette.fg.inverted.hover',
          backgroundColor: 'colorPalette.surface.strong.hover'
        },
        _active: {
          color: 'colorPalette.fg.inverted.active',
          backgroundColor: 'colorPalette.surface.strong.active'
        }
      },
      default: {
        borderColor: 'colorPalette.border.subtle',
        _hover: {
          borderColor: 'colorPalette.border.subtle.hover',
          backgroundColor: 'colorPalette.surface.subtle.hover'
        },
        _active: {
          borderColor: 'colorPalette.border.active',
          backgroundColor: 'colorPalette.surface.subtle.active'
        }
      },
      subtle: {
        backgroundColor: 'colorPalette.surface.subtle',
        _hover: {
          backgroundColor: 'colorPalette.surface.subtle.hover'
        },
        _active: {
          backgroundColor: 'colorPalette.surface.subtle.active'
        }
      },
      subtler: {
        _hover: {
          backgroundColor: 'colorPalette.surface.subtler.hover'
        },
        _active: {
          backgroundColor: 'colorPalette.surface.subtler.active'
        }
      }
    },
    size: {
      xs: {
        minHeight: '300',
        fontSize: 'xs',
        px: '150',
        py: '050'
      },
      sm: {
        minHeight: '400',
        fontSize: 'sm',
        px: '200',
        py: '075'
      },
      md: {
        minHeight: '500',
        fontSize: 'md',
        px: '250',
        py: '100'
      },
      lg: {
        minHeight: '600',
        fontSize: 'lg',
        px: '250',
        py: '100'
      }
    }
  },
  defaultVariants: {
    emphasis: 'default',
    size: 'md'
  }
})
