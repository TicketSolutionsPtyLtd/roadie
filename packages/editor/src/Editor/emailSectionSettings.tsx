'use client'

import { useState } from 'react'

import { Field } from '@oztix/roadie-components/field'
import { Select } from '@oztix/roadie-components/select'

import { type SectionLook, type SectionSpacing } from '../schema/emailAttrs'
import {
  type ShowWhen,
  type ShowWhenOp,
  showWhenRule
} from '../schema/showWhen'
import { type EditorVariable, textVariables } from '../schema/variables'
import type { BlockSettings } from './EditorBlockSettings'
import { EditorChoice } from './EditorChoice'

type Attrs = Record<string, unknown>

const LOOKS = [
  { value: 'plain', label: 'Plain' },
  { value: 'tint', label: 'Tint' },
  { value: 'accent', label: 'Accent' }
] as const

const SPACINGS = [
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'roomy', label: 'Roomy' }
] as const

const OPS: readonly { value: ShowWhenOp; label: string }[] = [
  { value: 'exists', label: 'Is set' },
  { value: 'equals', label: 'Is' },
  { value: 'notEquals', label: 'Isn’t' },
  { value: 'lessThan', label: 'Is less than' },
  { value: 'greaterThan', label: 'Is more than' }
]

// A Select value, kept apart from any variable's key.
const EVERYONE = 'everyone'

const NUMERIC: ReadonlySet<ShowWhenOp> = new Set(['lessThan', 'greaterThan'])

type Draft = { key: string; op: ShowWhenOp; value: string }

const draftOf = (rule: ShowWhen | undefined): Draft => ({
  key: rule?.key ?? EVERYONE,
  op: rule?.op ?? 'exists',
  value: rule && 'value' in rule ? String(rule.value) : ''
})

// A comparison needs a number; the rest compare the text as typed.
function ruleOf({ key, op, value }: Draft) {
  const typed = NUMERIC.has(op) && value.trim() !== '' ? Number(value) : value
  return showWhenRule({ key, op, value: typed })
}

type SelectFieldProps = {
  label: string
  value: string
  items: readonly { value: string; label: string }[]
  onValueChange: (value: string) => void
  helperText?: string
}

function SelectField({
  label,
  value,
  items,
  onValueChange,
  helperText
}: SelectFieldProps) {
  return (
    <Field>
      <Field.Label>{label}</Field.Label>
      <Select
        value={value}
        onValueChange={(chosen) => {
          if (typeof chosen === 'string') onValueChange(chosen)
        }}
        items={items}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          {items.map((item) => (
            <Select.Item key={item.value} value={item.value}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      {helperText ? <Field.HelperText>{helperText}</Field.HelperText> : null}
    </Field>
  )
}

type ShowToProps = {
  rule: ShowWhen | undefined
  variables: readonly EditorVariable[]
  onRuleChange: (rule: ShowWhen | undefined) => void
}

const ruleKey = (rule: ShowWhen | undefined) => JSON.stringify(rule ?? null)

/** Who sees a section: everyone, or those whose variable passes a rule. */
function ShowTo({ rule, variables, onRuleChange }: ShowToProps) {
  const [draft, setDraft] = useState(() => draftOf(rule))
  // The rule last sent or read, so one changed from outside, as by Undo,
  // resets the draft, but one sent keeps a value still being typed.
  const [seen, setSeen] = useState(() => ruleKey(rule))
  if (ruleKey(rule) !== seen) {
    setSeen(ruleKey(rule))
    setDraft(draftOf(rule))
  }
  const send = (next: ShowWhen | undefined) => {
    setSeen(ruleKey(next))
    onRuleChange(next)
  }
  // A rule can name a key the editor no longer lists, which stays choosable.
  const listed = textVariables(variables)
  const keys = [
    { value: EVERYONE, label: 'Everyone' },
    ...listed.map(({ key, label }) => ({ value: key, label })),
    ...(rule && !listed.some(({ key }) => key === rule.key)
      ? [{ value: rule.key, label: rule.key }]
      : [])
  ]
  const change = (next: Partial<Draft>) => {
    const changed = { ...draft, ...next }
    setDraft(changed)
    if (changed.key === EVERYONE) {
      send(undefined)
      return
    }
    // Applies once whole, so a half-typed value leaves the last rule.
    const whole = ruleOf(changed)
    if (whole) send(whole)
  }
  const ruled = draft.key !== EVERYONE
  return (
    <div className='grid gap-4'>
      <SelectField
        label='Show to'
        value={draft.key}
        items={keys}
        onValueChange={(key) => change({ key })}
        helperText={
          ruled
            ? 'Everyone else gets the email without this section.'
            : undefined
        }
      />
      {ruled ? (
        <SelectField
          label='When'
          value={draft.op}
          items={OPS}
          onValueChange={(op) => change({ op: op as ShowWhenOp })}
        />
      ) : null}
      {ruled && draft.op !== 'exists' ? (
        <Field invalid={draft.value.trim() !== '' && !ruleOf(draft)}>
          <Field.Label>Value</Field.Label>
          <Field.Input
            inputMode={NUMERIC.has(draft.op) ? 'decimal' : undefined}
            value={draft.value}
            onChange={(event) => change({ value: event.target.value })}
          />
          <Field.ErrorText>
            Enter a number, such as 50. Until then, the last rule stays.
          </Field.ErrorText>
        </Field>
      ) : null}
    </div>
  )
}

/**
 * An email section's settings: a look from the email's theme, its spacing,
 * and who it shows to. Each default saves nothing.
 */
export function emailSectionSettings(
  variables: () => readonly EditorVariable[] | undefined
): BlockSettings {
  return {
    label: 'Section',
    settings: [
      {
        name: 'look',
        type: 'own',
        render: (attrs: Attrs, set) => (
          <EditorChoice
            legend='Look'
            choices={LOOKS}
            value={(attrs.look as SectionLook | undefined) ?? 'plain'}
            onValueChange={(look) =>
              set({ look: look === 'plain' ? undefined : look })
            }
          />
        )
      },
      {
        name: 'spacing',
        type: 'own',
        render: (attrs: Attrs, set) => (
          <EditorChoice
            legend='Spacing'
            choices={SPACINGS}
            value={(attrs.spacing as SectionSpacing | undefined) ?? 'normal'}
            onValueChange={(spacing) =>
              set({ spacing: spacing === 'normal' ? undefined : spacing })
            }
          />
        )
      },
      {
        name: 'showWhen',
        type: 'own',
        render: (attrs: Attrs, set) => (
          <ShowTo
            rule={showWhenRule(attrs.showWhen)}
            variables={variables() ?? []}
            onRuleChange={(showWhen) => set({ showWhen })}
          />
        )
      }
    ]
  }
}
