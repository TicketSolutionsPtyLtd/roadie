import { forwardRef } from 'react'

import { styled } from '@oztix/roadie-core/jsx'
import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'

interface PathData {
  d: string
  layer: 'outline' | 'face' | 'detail' | 'shadow' | 'highlight' | 'stroke'
}

interface IllustrationData {
  viewBox: string
  paths: PathData[]
}

const StyledSvg = styled('svg', {
  base: {
    boxSize: '600',
    fill: 'none',
    '& [data-part="outline"]': {
      fill: 'illustrations.outline'
    },
    '& [data-part="face"]': {
      fill: 'illustrations.face'
    },
    '& [data-part="detail"]': {
      fill: 'illustrations.detail'
    },
    '& [data-part="shadow"]': {
      fill: 'illustrations.shadow'
    },
    '& [data-part="highlight"]': {
      fill: 'illustrations.highlight'
    },
    '& [data-part="stroke"]': {
      stroke: 'illustrations.stroke',
      strokeWidth: '0.5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: 'none'
    }
  },
  variants: {
    outline: {
      true: {
        '& [data-part="outline"]': {
          opacity: 1
        }
      },
      false: {
        '& [data-part="outline"]': {
          opacity: 0
        }
      }
    }
  },
  defaultVariants: {
    outline: false
  }
})

export interface SpotIllustrationProps
  extends Omit<HTMLStyledProps<'svg'>, 'outline'> {
  /**
   * Illustration definition containing viewBox and paths
   */
  illustration: IllustrationData
  /**
   * Whether to show the outline layer
   * @default false
   */
  outline?: boolean
}

export const SpotIllustration = forwardRef<
  SVGSVGElement,
  SpotIllustrationProps
>(({ illustration, ...props }, ref) => {
  // Fallback to default viewBox if not provided
  const { viewBox = '0 0 48 48', paths } = illustration

  return (
    <StyledSvg
      ref={ref}
      xmlns='http://www.w3.org/2000/svg'
      viewBox={viewBox}
      {...props}
    >
      {paths.map((path: PathData, index: number) => (
        <path key={index} d={path.d} data-part={path.layer} />
      ))}
    </StyledSvg>
  )
})

SpotIllustration.displayName = 'SpotIllustration'
