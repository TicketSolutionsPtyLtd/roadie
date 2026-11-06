'use client'

import { type ClipboardEvent, useState, useSyncExternalStore } from 'react'

import {
  Field,
  useFieldContext,
  useFieldControlError
} from '@oztix/roadie-components/field'
import { cn } from '@oztix/roadie-core/utils'

import {
  EmailPreviewFrame,
  type PreviewWidth,
  PreviewWidthToggle
} from './EmailPreviewFrame'
import { htmlWarning } from './htmlWarning'

export type EmailHtmlFieldProps = {
  /** The email's HTML, for a controlled field. */
  value?: string
  /** The starting HTML, for an uncontrolled field. */
  defaultValue?: string
  /** Called with the HTML on each change, exactly as written. */
  onValueChange?: (html: string) => void
  /** Submits the HTML with a native form, under this name. */
  name?: string
  placeholder?: string
  readOnly?: boolean
  /** Takes no input and dims, as does a disabled `Field` around it. */
  disabled?: boolean
  'aria-label'?: string
  className?: string
}

const noSubscription = () => () => {}

/**
 * The source of an email kept as HTML, with a preview at 600 pixels and on a
 * phone. Pasting keeps the clipboard's HTML. A script, an event handler, or a
 * `javascript:` link shows a warning, but the HTML is never rewritten.
 */
export function EmailHtmlField({
  value,
  defaultValue = '',
  onValueChange,
  className,
  ...props
}: EmailHtmlFieldProps) {
  const field = useFieldContext()
  const [ownHtml, setOwnHtml] = useState(defaultValue)
  const [width, setWidth] = useState<PreviewWidth>('desktop')
  const html = value ?? ownHtml
  // DOMParser is browser-only, and Field.ErrorText shows a warning only after hydration anyway.
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  )
  const warning = inBrowser ? htmlWarning(html) : null
  useFieldControlError(warning)

  const change = (next: string) => {
    setOwnHtml(next)
    onValueChange?.(next)
  }

  return (
    <div data-slot='email-html-field' className={cn('grid gap-3', className)}>
      <Field.Textarea
        {...props}
        value={html}
        onChange={(event) => change(event.target.value)}
        onPaste={pasteHtml}
        spellCheck={false}
        className='min-h-60 font-mono text-sm'
      />
      {warning && !field.fieldId ? (
        // In a Field, Field.ErrorText shows it instead.
        <p role='alert' className='text-sm text-subtle intent-danger'>
          {warning}
        </p>
      ) : null}
      <PreviewWidthToggle
        className='justify-self-start'
        value={width}
        onValueChange={setWidth}
      />
      <EmailPreviewFrame html={html} width={width} />
    </div>
  )
}

EmailHtmlField.displayName = 'EmailHtmlField'

function pasteHtml(event: ClipboardEvent<HTMLTextAreaElement>) {
  if (event.currentTarget.readOnly) return
  const html = event.clipboardData.getData('text/html')
  if (!html) return
  const text = event.clipboardData.getData('text/plain')
  event.preventDefault()
  // Source copied from a code editor carries its highlighting as HTML.
  insertText(event.currentTarget, /^\s*</.test(text) ? text : html)
}

function insertText(textarea: HTMLTextAreaElement, text: string) {
  // execCommand keeps the browser's undo history, which setRangeText loses.
  if (document.execCommand('insertText', false, text)) return
  textarea.setRangeText(
    text,
    textarea.selectionStart,
    textarea.selectionEnd,
    'end'
  )
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}
