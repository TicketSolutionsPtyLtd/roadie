'use client'

import type { ReactNode, RefObject } from 'react'

import { Fieldset } from '@oztix/roadie-components/fieldset'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'

export type Choice<Value extends string> = { value: Value; label: string }

type EditorChoiceProps<Value extends string> = {
  legend: string
  choices: readonly Choice<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  disabled?: boolean
  helperText?: ReactNode
  /** Given to the chosen item, for a form to open with focus there. */
  chosenRef?: RefObject<HTMLButtonElement | null>
}

/** One of a few choices, as a row of buttons under a label. */
export function EditorChoice<Value extends string>({
  legend,
  choices,
  value,
  onValueChange,
  disabled,
  helperText,
  chosenRef
}: EditorChoiceProps<Value>) {
  return (
    <Fieldset className='grid gap-1.5 [&>*+*]:mt-0' disabled={disabled}>
      {/* A label's size, as a Field's, not a section's. */}
      <Fieldset.Legend className='text-sm font-medium text-normal'>
        {legend}
      </Fieldset.Legend>
      <ToggleGroup
        value={[value]}
        // Pressing the chosen item again would leave none, so it's ignored.
        onValueChange={([chosen]) => {
          if (chosen) onValueChange(chosen as Value)
        }}
        disabled={disabled}
        className='w-full'
      >
        {choices.map((choice) => (
          <ToggleGroup.Item
            key={choice.value}
            ref={choice.value === value ? chosenRef : undefined}
            value={choice.value}
            className='flex-1'
          >
            {choice.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
      {helperText ? (
        <Fieldset.HelperText>{helperText}</Fieldset.HelperText>
      ) : null}
    </Fieldset>
  )
}
