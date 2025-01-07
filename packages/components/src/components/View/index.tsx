import type { ElementType } from 'react'
import React from 'react'

import { styled } from '@oztix/roadie-core/jsx'
import type { JsxStyleProps } from '@oztix/roadie-core/types'

type AsProp<C extends ElementType> = {
  as?: C
}

type PropsToOmit<C extends ElementType, P> = keyof (AsProp<C> & P)

/**
 * A foundational layout component that provides a flexible container with sensible defaults.
 */
export interface ViewProps<C extends ElementType = 'div'> {
  /**
   * The HTML element or React component to render the View as
   * @default 'div'
   */
  as?: C
  /**
   * The display property of the View
   * @default 'flex'
   */
  display?: JsxStyleProps['display']
  /**
   * The position property of the View
   * @default 'relative'
   */
  position?: JsxStyleProps['position']
  /**
   * The flex direction property of the View
   * @default 'column'
   */
  flexDirection?: JsxStyleProps['flexDirection']
  /**
   * The flex wrap property of the View
   * @default 'nowrap'
   */
  flexWrap?: JsxStyleProps['flexWrap']
  /**
   * The align items property of the View
   * @default 'stretch'
   */
  alignItems?: JsxStyleProps['alignItems']
  /**
   * The align self property of the View
   * @default 'flex-start'
   */
  alignSelf?: JsxStyleProps['alignSelf']
  /**
   * The align content property of the View
   * @default 'flex-start'
   */
  alignContent?: JsxStyleProps['alignContent']
  /**
   * The justify content property of the View
   * @default 'flex-start'
   */
  justifyContent?: JsxStyleProps['justifyContent']
  /**
   * The min height property of the View
   * @default '0'
   */
  minHeight?: JsxStyleProps['minHeight']
  /**
   * The min width property of the View
   * @default '0'
   */
  minWidth?: JsxStyleProps['minWidth']
}

export type PolymorphicViewProps<C extends ElementType> = ViewProps<C> &
  Omit<React.ComponentPropsWithRef<C>, PropsToOmit<C, ViewProps>> &
  JsxStyleProps

type ViewComponent = {
  <C extends ElementType = 'div'>(
    props: PolymorphicViewProps<C>
  ): React.ReactElement | null
  displayName?: string
}

const StyledView = styled('div', {
  base: {
    display: 'flex',
    position: 'relative',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    alignContent: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 0,
    minWidth: 0
  }
})

export const View = StyledView as ViewComponent

View.displayName = 'View'
