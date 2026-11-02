import { useId } from 'react'

import type { BlockAction } from '../Provider'
import type { BlockDefinition } from '../catalogue'
import type { BlockActionsProps } from './BlockActions'
import type { BlockHeadingProps } from './BlockHeading'
import type { BlockRootProps } from './BlockRoot'
import { presetOf } from './presets'
import type {
  BlockAlign,
  BlockIntent,
  BlockSize,
  SurfaceEmphasis
} from './surface'

/** The props every block takes for its frame. */
export type BlockFrameProps = {
  preset?: string
  position?: number
  id?: string
  eyebrow?: string
  /** Optional only where a block can go without a heading, as RichText can. */
  title?: string
  titleHighlight?: string | string[]
  description?: string
  actions?: readonly BlockAction[]
  intent?: BlockIntent
  emphasis?: SurfaceEmphasis
  contained?: boolean
  align?: BlockAlign
  size?: BlockSize
}

/**
 * Resolves a block's frame: the preset it renders, and its alignment and surface from its
 * props, then a fallback its content decides, then the preset's defaults. Hands back the
 * props for its root, heading, and actions, so a block renders only its own body.
 */
export function useBlock<
  Definition extends BlockDefinition,
  Props extends BlockFrameProps
>(definition: Definition, props: Props, fallback: { align?: BlockAlign } = {}) {
  const headingId = useId()
  const preset = presetOf(definition, props.preset)
  const defaults = preset.defaults ?? {}
  const align = props.align ?? fallback.align ?? defaults.align ?? 'start'
  return {
    name: preset.name as Definition['presets'][number]['name'],
    align,
    // A preset's default emphasis is one its block's own props accept.
    emphasis: (props.emphasis ?? defaults.emphasis) as
      | Extract<Props['emphasis'], SurfaceEmphasis>
      | undefined,
    contained: props.contained ?? defaults.contained ?? false,
    root: {
      block: definition.name,
      variant: preset.variant,
      preset: preset.name,
      position: props.position,
      id: props.id,
      intent: props.intent,
      'aria-labelledby': headingId
    } satisfies BlockRootProps,
    heading: {
      id: headingId,
      eyebrow: props.eyebrow,
      title: props.title ?? '',
      titleHighlight: props.titleHighlight,
      description: props.description,
      align,
      size: props.size,
      intent: props.intent
    } satisfies BlockHeadingProps,
    actions: {
      actions: props.actions,
      intent: props.intent,
      align
    } satisfies BlockActionsProps
  }
}

/** A block's resolved frame, for a block that hands it to its preset's own component. */
export type BlockFrame = ReturnType<typeof useBlock>
