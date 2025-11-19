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
    textStyle: 'ui',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    transition: 'all 0.2s',
    color: 'colorPalette.fg',
    whiteSpace: 'nowrap',
    gap: '075',
    _icon: {
      flexShrink: 0
    },
    _hoverFocusVisible: {
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
        textShadow: '0 1px 1px rgba(0, 0, 0, 0.15)',
        backgroundColor: 'colorPalette.surface.strong',
        _hoverFocusVisible: {
          backgroundColor: 'colorPalette.surface.strong.hover'
        },
        _active: {
          backgroundColor: 'colorPalette.surface.strong.active'
        },
        _dark: {
          textShadow: '0 1px 1px rgba(255, 255, 255, 0.15)'
        }
      },
      default: {
        borderColor: 'colorPalette.border.subtle',
        backdropFilter: 'blur(4px)',
        _hoverFocusVisible: {
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
        backdropFilter: 'blur(4px)',
        _hoverFocusVisible: {
          backgroundColor: 'colorPalette.surface.subtle.hover'
        },
        _active: {
          backgroundColor: 'colorPalette.surface.subtle.active'
        }
      },
      subtler: {
        _hoverFocusVisible: {
          backgroundColor: 'colorPalette.surface.subtler.hover',
          backdropFilter: 'blur(4px)'
        },
        _active: {
          backgroundColor: 'colorPalette.surface.subtler.active',
          backdropFilter: 'blur(4px)'
        }
      }
    },
    size: {
      xs: {
        height: '300',
        minW: '300',
        fontSize: 'xs',
        px: '150',
        py: '050',
        _icon: {
          width: '200',
          height: '200'
        }
      },
      sm: {
        height: '400',
        minW: '400',
        fontSize: 'sm',
        px: '200',
        py: '075',
        _icon: {
          width: '250',
          height: '250'
        }
      },
      md: {
        height: '500',
        minW: '500',
        fontSize: 'md',
        px: '250',
        py: '100',
        _icon: {
          width: '300',
          height: '300'
        }
      },
      lg: {
        height: '600',
        minW: '600',
        fontSize: 'lg',
        px: '400',
        py: '100',
        _icon: {
          width: '300',
          height: '300'
        }
      }
    }
  },
  defaultVariants: {
    emphasis: 'default',
    size: 'md'
  }
})

export const button = buttonRecipe
