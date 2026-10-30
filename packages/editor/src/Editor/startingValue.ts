import type { Preset } from '../schema/presetShapes'
import { type EditorValue, createEmptyValue, migrate } from '../schema/value'
import type { EditorRootProps } from './EditorRoot'

type PresetProps = Pick<
  EditorRootProps,
  'preset' | 'value' | 'defaultValue' | 'extensions'
>

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
