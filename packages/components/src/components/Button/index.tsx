import type { ComponentPropsWithoutRef } from 'react'

import { cva, cx } from '@oztix/roadie-core/css'

/**
 * Button emphasis variants
 */
type ButtonEmphasis = 'strong' | 'default' | 'subtle' | 'muted'

/**
 * Button size variants
 */
type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Props for the Button component
 */
export interface ButtonProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'className'> {
  /** The visual style of the button */
  emphasis?: ButtonEmphasis
  /** The size of the button */
  size?: ButtonSize
  /** The color palette to use for the button */
  colorPalette?:
    | 'neutral'
    | 'accent'
    | 'brand'
    | 'information'
    | 'success'
    | 'warning'
    | 'danger'
  /** Additional class names to be applied to the button */
  className?: string
}

export const buttonRecipe = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: '050',
    fontWeight: 'medium',
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
        backgroundColor: 'colorPalette.solid.strong',
        _hover: {
          color: 'colorPalette.fg.inverted.hover',
          backgroundColor: 'colorPalette.solid.strong.hover'
        },
        _active: {
          color: 'colorPalette.fg.inverted.active',
          backgroundColor: 'colorPalette.solid.strong.active'
        }
      },
      default: {
        borderColor: 'colorPalette.border',
        backgroundColor: 'colorPalette.surface.subtle',
        _hover: {
          borderColor: 'colorPalette.border.hover',
          backgroundColor: 'colorPalette.surface.subtle.hover'
        },
        _active: {
          borderColor: 'colorPalette.border.active',
          backgroundColor: 'colorPalette.surface.subtle.active'
        }
      },
      subtle: {
        backgroundColor: 'colorPalette.solid.subtle',

        _hover: {
          backgroundColor: 'colorPalette.solid.subtle.hover'
        },
        _active: {
          backgroundColor: 'colorPalette.solid.subtle.active'
        }
      },
      muted: {
        _hover: {
          backgroundColor: 'colorPalette.solid.subtle.hover'
        },
        _active: {
          backgroundColor: 'colorPalette.solid.subtle.active'
        }
      }
    },
    colorPalette: {
      neutral: {
        colorPalette: 'neutral'
      },
      accent: {
        colorPalette: 'accent'
      },
      brand: {
        colorPalette: 'brand'
      },
      information: {
        colorPalette: 'information'
      },
      success: {
        colorPalette: 'success'
      },
      warning: {
        colorPalette: 'warning'
      },
      danger: {
        colorPalette: 'danger'
      }
    },
    size: {
      sm: {
        minHeight: '400',
        fontSize: 'sm',
        px: '200',
        py: '075'
      },
      md: {
        minHeight: '500',
        fontSize: 'md',
        px: '200',
        py: '100'
      },
      lg: {
        minHeight: '600',
        fontSize: 'lg',
        px: '300',
        py: '150'
      }
    }
  },
  defaultVariants: {
    emphasis: 'default',
    colorPalette: 'neutral',
    size: 'md'
  }
})

export function Button({
  children,
  emphasis = 'default',
  size = 'md',
  colorPalette = 'neutral',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(buttonRecipe({ emphasis, size, colorPalette }), className)}
      {...props}
    >
      {children}
    </button>
  )
}
