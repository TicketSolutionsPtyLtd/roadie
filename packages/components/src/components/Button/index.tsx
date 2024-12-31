import { type ReactNode } from 'react'

import { Button as AriaButton } from 'react-aria-components'

import { cva, cx } from '@oztix/roadie-core/css'

/**
 * Button appearance variants
 */
type ButtonAppearance = 'solid' | 'outline' | 'ghost'

/**
 * Button size variants
 */
type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Button color variants
 */
type Emphasis = 'subtle' | 'accent' | 'inverse' | 'success' | 'warning' | 'danger'

/**
 * Props for the Button component
 */
export interface ButtonProps {
  /** The content to be rendered inside the button */
  children: ReactNode
  /** The visual style of the button */
  appearance?: ButtonAppearance
  /** The size of the button */
  size?: ButtonSize
  /** The color of the button */
  emphasis?: Emphasis
  /** Whether the button is disabled */
  isDisabled?: boolean
  /** Callback function when the button is pressed */
  onPress?: () => void
  /** Additional class names to be applied to the button */
  className?: string
}

const button = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: '050',
    fontWeight: 'semibold',
    fontFamily: 'ui',
    cursor: 'pointer',
    border: '1px solid',
    transition: 'all 0.2s',
    _disabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
      backgroundColor: 'bg.disabled',
      color: 'fg.disabled'
    },
    _focus: {
      outline: 'none'
    },
    _focusVisible: {
      outline: '2px solid',
      outlineColor: 'border.focused'
    }
  },
  variants: {
    appearance: {
      solid: {
        backgroundColor: 'bg.subtle',
        borderColor: 'border.subtle',
        color: 'fg',
        _hover: {
          backgroundColor: 'bg.subtle.hovered'
        },
        _active: {
          backgroundColor: 'bg.subtle.pressed'
        }
      },
      outline: {
        border: '1px solid',
        borderColor: 'border.subtle',
        color: 'fg.subtle',
        _hover: {
          color: 'fg',
          borderColor: 'border.hovered',
          backgroundColor: 'bg.hovered'
        },
        _active: {
          color: 'fg',
          borderColor: 'border.pressed',
          backgroundColor: 'bg.pressed'
        }
      },
      ghost: {
        color: 'fg.subtle',
        borderColor: 'transparent',
        _hover: {
          color: 'fg',
          backgroundColor: 'bg.hovered'
        },
        _active: {
          color: 'fg',
          backgroundColor: 'bg.pressed'
        }
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
    },
    emphasis: {
      subtle: {
        color: 'fg.subtle'
      },
      accent: {
        color: 'fg.accent'
      },
      inverse: {
        color: 'fg.inverse'
      },
      success: {
        color: 'fg.success'
      },
      warning: {
        color: 'fg.warning'
      },
      danger: {
        color: 'fg.danger'
      }
    }
  },
  compoundVariants: [
    {
      appearance: 'solid',
      emphasis: 'accent',
      css: {
        backgroundColor: 'bg.accent.bold',
        color: 'fg.accent.inverse',
        borderColor: 'border.accent',
        _hover: {
          backgroundColor: 'bg.accent.bold.hovered'
        },
        _active: {
          backgroundColor: 'bg.accent.bold.pressed'
        }
      }
    },
    {
      appearance: 'solid',
      emphasis: 'inverse',
      css: {
        backgroundColor: 'bg.inverse',
        color: 'fg.inverse',
        _hover: {
          backgroundColor: 'bg.inverse.hovered'
        },
        _active: {
          backgroundColor: 'bg.inverse.pressed'
        }
      }
    },
    {
      appearance: 'solid',
      emphasis: 'success',
      css: {
        backgroundColor: 'bg.success.bold',
        color: 'fg.success.inverse',
        borderColor: 'border.success',
        _hover: {
          backgroundColor: 'bg.success.bold.hovered'
        },
        _active: {
          backgroundColor: 'bg.success.bold.pressed'
        }
      }
    },
    {
      appearance: 'solid',
      emphasis: 'warning',
      css: {
        backgroundColor: 'bg.warning.bold',
        color: 'fg.warning.inverse',
        borderColor: 'border.warning',
        _hover: {
          backgroundColor: 'bg.warning.bold.hovered'
        },
        _active: {
          backgroundColor: 'bg.warning.bold.pressed'
        }
      }
    },
    {
      appearance: 'solid',
      emphasis: 'danger',
      css: {
        backgroundColor: 'bg.danger.bold',
        color: 'fg.danger.inverse',
        borderColor: 'border.danger',
        _hover: {
          backgroundColor: 'bg.danger.bold.hovered'
        },
        _active: {
          backgroundColor: 'bg.danger.bold.pressed'
        }
      }
    },
    {
      appearance: 'outline',
      emphasis: 'accent',
      css: {
        borderColor: 'border.accent',
        _hover: {
          color: 'fg.accent.hovered',
          borderColor: 'border.accent.hovered',
          backgroundColor: 'bg.accent.hovered'
        },
        _active: {
          color: 'fg.accent.pressed',
          borderColor: 'border.accent.pressed',
          backgroundColor: 'bg.accent.pressed'
        }
      }
    },
    {
      appearance: 'outline',
      emphasis: 'inverse',
      css: {
        borderColor: 'border.bold',
        color: 'fg',
        _hover: {
          color: 'fg.hovered',
          borderColor: 'border.bold.hovered',
          backgroundColor: 'bg.hovered'
        },
        _active: {
          color: 'fg.pressed',
          borderColor: 'border.bold.pressed',
          backgroundColor: 'bg.pressed'
        }
      }
    },
    {
      appearance: 'outline',
      emphasis: 'success',
      css: {
        borderColor: 'border.success',
        _hover: {
          color: 'fg.success.hovered',
          borderColor: 'border.success.hovered',
          backgroundColor: 'bg.success.hovered'
        },
        _active: {
          color: 'fg.success.pressed',
          borderColor: 'border.success.pressed',
          backgroundColor: 'bg.success.pressed'
        }
      }
    },
    {
      appearance: 'outline',
      emphasis: 'warning',
      css: {
        borderColor: 'border.warning',
        _hover: {
          color: 'fg.warning.hovered',
          borderColor: 'border.warning.hovered',
          backgroundColor: 'bg.warning.hovered'
        },
        _active: {
          color: 'fg.warning.pressed',
          borderColor: 'border.warning.pressed',
          backgroundColor: 'bg.warning.pressed'
        }
      }
    },
    {
      appearance: 'outline',
      emphasis: 'danger',
      css: {
        borderColor: 'border.danger',
        _hover: {
          color: 'fg.danger.hovered',
          borderColor: 'border.danger.hovered',
          backgroundColor: 'bg.danger.hovered'
        },
        _active: {
          color: 'fg.danger.pressed',
          borderColor: 'border.danger.pressed',
          backgroundColor: 'bg.danger.pressed'
        }
      }
    },
    {
      appearance: 'ghost',
      emphasis: 'accent',
      css: {
        _hover: {
          color: 'fg.accent.hovered',
          backgroundColor: 'bg.accent.hovered'
        },
        _active: {
          color: 'fg.accent.pressed',
          backgroundColor: 'bg.accent.pressed'
        }
      }
    },
    {
      appearance: 'ghost',
      emphasis: 'inverse',
      css: {
        color: 'fg',
        _hover: {
          color: 'fg.hovered',
          backgroundColor: 'bg.hovered'
        },
        _active: {
          color: 'fg.pressed',
          backgroundColor: 'bg.pressed'
        }
      }
    },
    {
      appearance: 'ghost',
      emphasis: 'success',
      css: {
        _hover: {
          color: 'fg.success.hovered',
          backgroundColor: 'bg.success.hovered'
        },
        _active: {
          color: 'fg.success.pressed',
          backgroundColor: 'bg.success.pressed'
        }
      }
    },
    {
      appearance: 'ghost',
      emphasis: 'warning',
      css: {
        _hover: {
          color: 'fg.warning.hovered',
          backgroundColor: 'bg.warning.hovered'
        },
        _active: {
          color: 'fg.warning.pressed',
          backgroundColor: 'bg.warning.pressed'
        }
      }
    },
    {
      appearance: 'ghost',
      emphasis: 'danger',
      css: {
        _hover: {
          color: 'fg.danger.hovered',
          backgroundColor: 'bg.danger.hovered'
        },
        _active: {
          color: 'fg.danger.pressed',
          backgroundColor: 'bg.danger.pressed'
        }
      }
    }
  ],
  defaultVariants: {
    appearance: 'solid',
    size: 'md',
    emphasis: 'subtle'
  }
})

export function Button({
  children,
  appearance = 'solid',
  size = 'md',
  emphasis = 'subtle',
  isDisabled = false,
  onPress,
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      onPress={onPress}
      isDisabled={isDisabled}
      className={cx(button({ appearance, size, emphasis }), className)}
      {...props}
    >
      {children}
    </AriaButton>
  )
}
