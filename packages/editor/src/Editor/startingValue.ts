import type { Preset } from '../schema/presetShapes'
import { type EditorValue, createEmptyValue, migrate } from '../schema/value'
import type { EditorRootProps } from './EditorRoot'

/** The preset the editor edits; a value in another is read into it. */
export const EDITOR_PRESET: Preset = 'basic'

type ValueProps = Pick<EditorRootProps, 'value' | 'defaultValue'>

/** The value the editor opens with, which needs none of Tiptap to work out. */
export function startingValue(props: ValueProps): EditorValue {
  const stored =
    props.value ?? props.defaultValue ?? createEmptyValue(EDITOR_PRESET)
  return migrate(stored, EDITOR_PRESET)
}
