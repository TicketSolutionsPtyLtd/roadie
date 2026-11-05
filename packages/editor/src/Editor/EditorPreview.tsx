'use client'

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState
} from 'react'

import {
  ArrowLeftIcon,
  MoonIcon,
  PaperPlaneTiltIcon,
  SunIcon
} from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components/button'
import { Field } from '@oztix/roadie-components/field'
import { Popover } from '@oztix/roadie-components/popover'
import { Select } from '@oztix/roadie-components/select'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'

import {
  EmailPreviewFrame,
  type PreviewWidth,
  PreviewWidthToggle
} from '../EmailHtmlField/EmailPreviewFrame'
import type { EditorValue } from '../schema'

/** What a preview fills merge tags with and checks conditions against. */
export type EditorPreviewValues = Readonly<Record<string, string>>

/** A sample recipient Preview can show the email as. */
export type EditorPreviewRecipient = {
  label: string
  values: EditorPreviewValues
}

export type EditorRenderPreview = (
  value: EditorValue,
  options: { values: EditorPreviewValues }
) => Promise<string>

export type EditorSendTest = (
  value: EditorValue,
  options: { to: string; values: EditorPreviewValues }
) => Promise<void>

type ColorScheme = 'light' | 'dark'

type EditorPreviewProps = {
  value: EditorValue
  recipients: readonly EditorPreviewRecipient[] | undefined
  onRenderPreview: EditorRenderPreview
  onSendTest: EditorSendTest | undefined
  onClose: () => void
}

const NO_VALUES: EditorPreviewValues = {}

type Shown = { html: string; error: string | null; busy: boolean }

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

/**
 * The email as the host renders it, in place of the canvas: at a desktop's
 * or a phone's width, in light or dark, and as a chosen recipient.
 */
export function EditorPreview({
  value,
  recipients,
  onRenderPreview,
  onSendTest,
  onClose
}: EditorPreviewProps) {
  const [width, setWidth] = useState<PreviewWidth>('desktop')
  const [scheme, setScheme] = useState<ColorScheme>('light')
  const [recipient, setRecipient] = useState(0)
  const [shown, setShown] = useState<Shown>({
    html: '',
    error: null,
    busy: true
  })
  const backRef = useRef<HTMLButtonElement>(null)
  const previewAsId = useId()
  const values = recipients?.[recipient]?.values ?? NO_VALUES
  // A host's inline handler is new each render, which mustn't render again.
  const render = useEffectEvent(onRenderPreview)

  useEffect(() => {
    backRef.current?.focus()
  }, [])

  useEffect(() => {
    let latest = true
    setShown((current) => ({ ...current, busy: true }))
    render(value, { values }).then(
      (html) => {
        if (latest) setShown({ html, error: null, busy: false })
      },
      (error: unknown) => {
        if (latest) {
          setShown((current) => ({
            ...current,
            error: messageOf(error),
            busy: false
          }))
        }
      }
    )
    return () => {
      latest = false
    }
  }, [value, values])

  const closeOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    // A select or popover portals out, and its own Escape closes only it.
    const inPreview = event.currentTarget.contains(event.target as Node)
    if (event.key !== 'Escape' || !inPreview) return
    event.stopPropagation()
    onClose()
  }

  return (
    <div
      data-slot='editor-preview'
      className='grid content-start gap-3 p-3'
      onKeyDown={closeOnEscape}
    >
      <div className='flex flex-wrap items-center gap-2'>
        <Button ref={backRef} size='sm' emphasis='subtler' onClick={onClose}>
          <ArrowLeftIcon weight='bold' className='size-4' aria-hidden />
          Back to editing
        </Button>
        <PreviewWidthToggle value={width} onValueChange={setWidth} />
        <ToggleGroup
          aria-label='Colour scheme'
          size='sm'
          value={[scheme]}
          onValueChange={([next]) => next && setScheme(next as ColorScheme)}
        >
          <ToggleGroup.Item value='light'>
            <SunIcon weight='bold' className='size-4' aria-hidden />
            Light
          </ToggleGroup.Item>
          <ToggleGroup.Item value='dark'>
            <MoonIcon weight='bold' className='size-4' aria-hidden />
            Dark
          </ToggleGroup.Item>
        </ToggleGroup>
        {recipients?.length ? (
          <div className='flex items-center gap-2'>
            <span id={previewAsId} className='text-sm text-subtle'>
              Preview as
            </span>
            <Select
              value={String(recipient)}
              onValueChange={(next) => setRecipient(Number(next))}
            >
              <Select.Trigger
                size='sm'
                aria-labelledby={previewAsId}
                className='w-auto'
              >
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Content>
                {recipients.map(({ label }, index) => (
                  <Select.Item key={label} value={String(index)}>
                    {label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        ) : null}
        {onSendTest ? (
          <SendTest
            className='ms-auto'
            onSend={(to) => onSendTest(value, { to, values })}
          />
        ) : null}
      </div>
      {shown.error ? (
        <p role='alert' className='text-sm text-subtle intent-danger'>
          The preview didn’t load. {shown.error}
        </p>
      ) : null}
      <EmailPreviewFrame
        html={shown.html}
        width={width}
        colorScheme={scheme}
        busy={shown.busy}
      />
    </div>
  )
}

// Enough to catch a slip; the host's sender decides what it can reach.
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Sending =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent'; to: string }
  | { state: 'failed'; message: string }

type SendTestProps = {
  onSend: (to: string) => Promise<void>
  className?: string
}

function SendTest({ onSend, className }: SendTestProps) {
  const [to, setTo] = useState('')
  const [sending, setSending] = useState<Sending>({ state: 'idle' })
  const address = to.trim()
  const canSend = ADDRESS.test(address) && sending.state !== 'sending'

  const send = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    setSending({ state: 'sending' })
    onSend(address).then(
      () => setSending({ state: 'sent', to: address }),
      (error: unknown) =>
        setSending({ state: 'failed', message: messageOf(error) })
    )
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) setSending({ state: 'idle' })
      }}
    >
      <Popover.Trigger
        render={
          <Button size='sm' emphasis='normal' className={className}>
            <PaperPlaneTiltIcon weight='bold' className='size-4' aria-hidden />
            Send test
          </Button>
        }
      />
      <Popover.Content className='w-xs max-w-(--available-width)'>
        <Popover.Body>
          <form className='grid gap-3' onSubmit={send}>
            <Field>
              <Field.Label>Send to</Field.Label>
              <Field.Input
                type='email'
                autoComplete='email'
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </Field>
            <Button
              type='submit'
              size='sm'
              intent='accent'
              emphasis='strong'
              disabled={!canSend}
              className='justify-self-start'
            >
              {sending.state === 'sending' ? 'Sending…' : 'Send'}
            </Button>
            <p role='status' className='text-sm text-subtle empty:hidden'>
              {sending.state === 'sent'
                ? `Sent to ${sending.to}`
                : sending.state === 'failed'
                  ? `The test didn’t send. ${sending.message}`
                  : null}
            </p>
          </form>
        </Popover.Body>
      </Popover.Content>
    </Popover>
  )
}
