'use client'

import {
  type KeyboardEvent,
  type SubmitEvent,
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
  SunIcon,
  UserSwitchIcon
} from '@phosphor-icons/react'

import { Button, IconButton } from '@oztix/roadie-components/button'
import { Field } from '@oztix/roadie-components/field'
import { Menu } from '@oztix/roadie-components/menu'
import { Popover } from '@oztix/roadie-components/popover'
import { Select } from '@oztix/roadie-components/select'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'
import { cn } from '@oztix/roadie-core/utils'

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

/** What an inbox lists the email with: its sender, subject, and preheader. */
export type EditorPreviewInbox = {
  sender?: string
  subject?: string
  preheader?: string
}

type EditorPreviewProps = {
  value: EditorValue
  inbox: EditorPreviewInbox
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
  inbox,
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
  // A host's list can shrink while Preview is open.
  const chosen = Math.max(0, Math.min(recipient, (recipients?.length ?? 1) - 1))
  const values = recipients?.[chosen]?.values ?? NO_VALUES
  // A host's inline list and handler are new each render, which mustn't
  // render the email again, so only the values themselves are compared.
  const valuesKey = JSON.stringify(values)
  const render = useEffectEvent(() => onRenderPreview(value, { values }))

  useEffect(() => {
    backRef.current?.focus()
  }, [])

  useEffect(() => {
    let latest = true
    setShown((current) => ({ ...current, busy: true }))
    render().then(
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
  }, [value, valuesKey])

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
      className='@container grid content-start gap-3 p-3'
      onKeyDown={closeOnEscape}
    >
      {/* One row on a phone: labels give way to icons, and Preview as to More. */}
      <div
        role='group'
        aria-label='Preview'
        className='flex items-center gap-2'
      >
        <Button ref={backRef} size='sm' emphasis='subtler' onClick={onClose}>
          <ArrowLeftIcon weight='bold' className='size-4' aria-hidden />
          <span className={NARROW_HIDDEN}>Back to editing</span>
        </Button>
        <PreviewWidthToggle
          value={width}
          onValueChange={setWidth}
          labelClassName={NARROW_HIDDEN}
        />
        <ToggleGroup
          aria-label='Colour scheme'
          size='sm'
          value={[scheme]}
          onValueChange={([next]) => next && setScheme(next as ColorScheme)}
        >
          <ToggleGroup.Item value='light'>
            <SunIcon weight='bold' className='size-4' aria-hidden />
            <span className={NARROW_HIDDEN}>Light</span>
          </ToggleGroup.Item>
          <ToggleGroup.Item value='dark'>
            <MoonIcon weight='bold' className='size-4' aria-hidden />
            <span className={NARROW_HIDDEN}>Dark</span>
          </ToggleGroup.Item>
        </ToggleGroup>
        {recipients?.length ? (
          <>
            <div className='flex min-w-0 items-center gap-2 @max-[34rem]:hidden'>
              <span id={previewAsId} className='shrink-0 text-sm text-subtle'>
                Preview as
              </span>
              <Select
                value={String(chosen)}
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
                    <Select.Item key={index} value={String(index)}>
                      {label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Menu>
              <Menu.Trigger
                render={
                  <IconButton
                    size='sm'
                    emphasis='subtler'
                    aria-label='Preview as'
                    className='@min-[34rem]:hidden'
                  >
                    <UserSwitchIcon weight='bold' className='size-4' />
                  </IconButton>
                }
              />
              <Menu.Content>
                <Menu.Group>
                  <Menu.GroupLabel>Preview as</Menu.GroupLabel>
                  <Menu.RadioGroup
                    value={String(chosen)}
                    onValueChange={(next) => setRecipient(Number(next))}
                  >
                    {recipients.map(({ label }, index) => (
                      <Menu.RadioItem
                        key={index}
                        value={String(index)}
                        closeOnClick
                      >
                        {label}
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Group>
              </Menu.Content>
            </Menu>
          </>
        ) : null}
        {onSendTest ? (
          <SendTest
            className='ms-auto'
            labelClassName={NARROW_HIDDEN}
            onSend={(to) => onSendTest(value, { to, values })}
          />
        ) : null}
      </div>
      {shown.error ? (
        <p role='alert' className='text-sm text-subtle intent-danger'>
          The preview didn’t load. {shown.error}
        </p>
      ) : null}
      {scheme === 'dark' ? (
        <p className='text-sm text-subtle'>
          Simulated dark mode: colours inverted, as some mail apps force on an
          email. Others keep it light.
        </p>
      ) : null}
      <EmailPreviewFrame
        html={shown.html}
        width={width}
        colorScheme={scheme}
        busy={shown.busy}
        header={<InboxRow {...inbox} scheme={scheme} />}
      />
    </div>
  )
}

// Hidden visually, still named, so a phone's bar fits on one row.
const NARROW_HIDDEN = '@max-[34rem]:sr-only'

// An inbox in a mail app's light or dark mode, whatever the app's own theme.
const INBOX_SCHEME: Record<ColorScheme, string> = {
  light:
    'bg-(--color-neutral-light-0) text-(--color-neutral-light-12) [--intent-text-strong:var(--color-neutral-light-13)] [--intent-text-subtle:var(--color-neutral-light-9)]',
  dark: 'bg-(--color-neutral-light-13) text-(--color-neutral-light-0) [--intent-text-strong:var(--color-neutral-light-0)] [--intent-text-subtle:var(--color-neutral-light-5)]'
}

function InboxRow({
  sender,
  subject,
  preheader,
  scheme
}: EditorPreviewInbox & { scheme: ColorScheme }) {
  if (!sender && !subject && !preheader) return null
  return (
    <div
      role='group'
      aria-label='In the inbox'
      className={cn(
        'grid min-w-0 emphasis-raised gap-0.5 rounded-lg px-3 py-2 text-sm',
        INBOX_SCHEME[scheme]
      )}
    >
      {sender ? (
        <p className='truncate font-semibold text-strong'>{sender}</p>
      ) : null}
      <p className='truncate'>
        {subject ? (
          <span className='font-medium text-strong'>{subject}</span>
        ) : null}
        {subject && preheader ? ' – ' : null}
        {preheader ? <span className='text-subtle'>{preheader}</span> : null}
      </p>
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
  labelClassName?: string
}

function SendTest({ onSend, className, labelClassName }: SendTestProps) {
  const [to, setTo] = useState('')
  const [sending, setSending] = useState<Sending>({ state: 'idle' })
  // Reopening starts afresh, so an earlier send's answer mustn't land.
  const sendId = useRef(0)
  // The popup would focus itself, which on a phone leaves the keyboard shut.
  const addressRef = useRef<HTMLInputElement>(null)
  const address = to.trim()
  const canSend = ADDRESS.test(address) && sending.state !== 'sending'

  const send = (event: SubmitEvent) => {
    event.preventDefault()
    // React bubbles a portalled submit to the form around the editor.
    event.stopPropagation()
    if (!canSend) return
    setSending({ state: 'sending' })
    const id = ++sendId.current
    onSend(address).then(
      () => {
        if (id === sendId.current) setSending({ state: 'sent', to: address })
      },
      (error: unknown) => {
        if (id === sendId.current) {
          setSending({ state: 'failed', message: messageOf(error) })
        }
      }
    )
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) return
        sendId.current += 1
        setSending({ state: 'idle' })
      }}
    >
      <Popover.Trigger
        render={
          <Button size='sm' emphasis='normal' className={className}>
            <PaperPlaneTiltIcon weight='bold' className='size-4' aria-hidden />
            <span className={labelClassName}>Send test</span>
          </Button>
        }
      />
      <Popover.Content
        className='w-xs max-w-(--available-width)'
        initialFocus={addressRef}
      >
        <Popover.Body>
          <form className='grid gap-3' onSubmit={send}>
            <Field>
              <Field.Label>Send to</Field.Label>
              <Field.Input
                ref={addressRef}
                type='email'
                autoComplete='email'
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
              {sending.state !== 'sending' && !canSend ? (
                <Field.HelperText>
                  {address === ''
                    ? 'Enter the address to send a test to.'
                    : 'Enter a whole address, such as name@example.com.'}
                </Field.HelperText>
              ) : null}
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
