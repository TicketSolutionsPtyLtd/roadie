import React from 'react'

import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { styled } from '@oztix/roadie-core/jsx'
import type { JsxElement, JsxStyleProps } from '@oztix/roadie-core/types'

type ViewElements =
  | 'div'
  | 'section'
  | 'article'
  | 'aside'
  | 'main'
  | 'header'
  | 'footer'
  | 'nav'
  | 'form'
  | 'figure'
  | 'figcaption'
  | 'ul'
  | 'ol'
  | 'li'
  | 'dl'
  | 'dt'
  | 'dd'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tfoot'
  | 'tr'
  | 'th'
  | 'td'
  | 'input'
  | 'select'
  | 'caption'
  | 'video'
  | 'audio'
  | 'canvas'
  | 'iframe'
  | 'embed'
  | 'object'
  | 'param'
  | 'source'
  | 'track'
  | 'map'
  | 'area'
  | 'summary'
  | 'details'
  | 'dialog'
  | 'menu'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'menuitemseparator'
  | 'menuitembutton'
  | 'progress'
  | 'meter'
  | 'output'
  | 'slot'
  | 'template'
  | 'slot'
  | 'template'
  | JsxElement<any, any>

export interface ViewProps extends HTMLStyledProps<'div'>, JsxStyleProps {
  /**
   * The HTML element to render the View as
   * @default 'div'
   */
  as?: ViewElements
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

/**
 * A foundational layout component that provides a flexible container with sensible defaults
 * Core style props are shown here. But you can pass any style props  available in Panda CSS to the View component.
 */
export const View = styled('div', {
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
}) as React.ForwardRefExoticComponent<ViewProps>

View.displayName = 'View'
