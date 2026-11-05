import type { Preset } from '../schema/presetShapes'
import { type EditorValue, createEmptyValue, migrate } from '../schema/value'
import type { EditorRootProps } from './EditorRoot'
import type { EditorEmphasis, EditorToolbarMode } from './variants'

type PresetProps = Pick<
  EditorRootProps,
  'preset' | 'value' | 'defaultValue' | 'extensions'
>

/**
 * How a preset opens when `emphasis` and the toolbar aren't given. A blocks
 * page is edited in place, so it has no box. An email lands in an inbox, not
 * on the page it's written on, so its box marks where the email ends. Both
 * float their toolbar, as the blocks have their own.
 */
export function presetLook(preset: Preset): {
  emphasis: EditorEmphasis
  toolbar: EditorToolbarMode
} {
  if (preset === 'blocks') return { emphasis: 'subtler', toolbar: 'floating' }
  if (preset === 'email') return { emphasis: 'normal', toolbar: 'floating' }
  return { emphasis: 'normal', toolbar: 'docked' }
}

const PRESET_HINTS: Partial<Record<Preset, string>> = {
  blocks: 'Type / to add a block',
  email: 'Type / for blocks, or pick a section'
}

/** What an empty line says to do, in a preset with the `/` menu. */
export function presetHint(preset: Preset) {
  return PRESET_HINTS[preset]
}

/** The `preset` prop, else the value's own preset, else `basic`. */
export function resolvedPreset({
  preset,
  value,
  defaultValue
}: PresetProps): Preset {
  return preset ?? (value ?? defaultValue)?.preset ?? 'basic'
}

/** The value the editor opens with, which needs none of Tiptap to work out. */
export function startingValue(props: PresetProps): EditorValue {
  const preset = resolvedPreset(props)
  const stored = props.value ?? props.defaultValue ?? createEmptyValue(preset)
  const customBlocks =
    preset === 'blocks'
      ? (props.extensions ?? []).map(({ node }) => node.name)
      : []
  return migrate(stored, preset, { customBlocks })
}
