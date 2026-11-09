'use client'

import { type RefObject, useState } from 'react'

import type { Editor as TiptapEditor } from '@tiptap/react'

import { Field } from '@oztix/roadie-components/field'
import { Select } from '@oztix/roadie-components/select'

import { isEmailHref } from '../schema/emailAttrs'
import { toHref, useLinkVariables } from './EditorLinkPopover'
import { isImeEnter } from './imeEnter'

/** Where a block links: a web address, or a link variable's key. */
export type LinkTarget = { href?: string; variable?: string }

// Select values, kept apart from any variable's key.
const WEB_ADDRESS = 'web'
const linkTo = (key: string) => `variable:${key}`

const REFUSED =
  'Enter a full web address, such as oztix.com.au, or a mailto: or tel: link.'

type EditorLinkTargetFieldsProps = {
  editor: TiptapEditor
  /** The block's target as the fields open. */
  target: LinkTarget
  /** Called as the target changes: a variable at once, an address once it's whole. */
  onTargetChange: (target: LinkTarget) => void
  inputRef?: RefObject<HTMLInputElement | null>
  /** Says so when an address is left part-typed; a block with no link may stay empty. */
  optional?: boolean
}

/**
 * Links to, a web address or the editor's link variables, and the Link
 * field for an address, which applies once it's whole and says so if it's
 * left part-typed.
 */
export function EditorLinkTargetFields({
  editor,
  target,
  onTargetChange,
  inputRef,
  optional = false
}: EditorLinkTargetFieldsProps) {
  const listed = useLinkVariables(editor)
  const { variable, href = '' } = target
  // A block can name a key the editor no longer lists, which stays choosable.
  const variables =
    !variable || listed.some(({ key }) => key === variable)
      ? listed
      : [...listed, { key: variable, label: variable }]
  const [linksTo, setLinksTo] = useState(
    variable ? linkTo(variable) : WEB_ADDRESS
  )
  const linked = variables.find(({ key }) => linkTo(key) === linksTo)
  const [typed, setTyped] = useState(href)
  const [refused, setRefused] = useState(false)
  const whole = (value: string) =>
    (optional && value.trim() === '') || isEmailHref(toHref(value))

  const applyHref = (value: string) => {
    if (optional && value.trim() === '') onTargetChange({})
    else if (isEmailHref(toHref(value))) onTargetChange({ href: toHref(value) })
  }

  return (
    <>
      {variables.length > 0 ? (
        <Field>
          <Field.Label>Links to</Field.Label>
          <Select
            value={linksTo}
            onValueChange={(value) => {
              if (typeof value !== 'string') return
              setLinksTo(value)
              const picked = variables.find(({ key }) => linkTo(key) === value)
              if (picked) onTargetChange({ variable: picked.key })
              else applyHref(typed)
            }}
            items={[
              { value: WEB_ADDRESS, label: 'A web address' },
              ...variables.map(({ key, label }) => ({
                value: linkTo(key),
                label
              }))
            ]}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={WEB_ADDRESS}>A web address</Select.Item>
              {variables.map(({ key, label }) => (
                <Select.Item key={key} value={linkTo(key)}>
                  {label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          {linked ? (
            <Field.HelperText>
              The sending system fills in this link for each customer.
            </Field.HelperText>
          ) : null}
        </Field>
      ) : null}
      {linked ? null : (
        <Field invalid={refused}>
          <Field.Label>Link</Field.Label>
          <Field.Input
            ref={inputRef}
            type='url'
            inputMode='url'
            placeholder={optional ? 'None' : 'Paste a link'}
            value={typed}
            onChange={(event) => {
              const value = event.target.value
              setTyped(value)
              setRefused(false)
              applyHref(value)
            }}
            // A Select's hidden input stops Enter submitting a form on its own.
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              if (!isImeEnter(event.nativeEvent))
                event.currentTarget.form?.requestSubmit()
            }}
            // Says so only once they've moved on, not while they type.
            onBlur={() => setRefused(!whole(typed))}
          />
          <Field.ErrorText>{REFUSED}</Field.ErrorText>
        </Field>
      )}
    </>
  )
}
