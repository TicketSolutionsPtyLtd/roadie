'use client'

import {
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  LockSimpleIcon,
  MagnifyingGlassIcon,
  XIcon
} from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { intentVariants } from '../../variants'
import { Combobox, type ComboboxChipProps } from '../Combobox'
import { useFieldContext } from '../Field'
import { Kbd } from '../Kbd'
import { Tooltip } from '../Tooltip'
import { exactSuggestion, listGroups } from './suggestions'
import type {
  QueryFieldAccepted,
  QueryFieldChip,
  QueryFieldSuggestion,
  QueryFieldSuggestionGroup
} from './types'
import { useSuggestions } from './useSuggestions'

export type QueryFieldProps<Value = unknown> = {
  /** The conditions applied, each read as one chip. Locked chips show first. */
  chips?: readonly QueryFieldChip[]
  /** A chip's remove button, Backspace on a selected chip, or Clear asks to remove it. */
  onRemoveChip?: (id: string) => void
  /** Makes unlocked chips buttons: open your editor `Popover` against `anchor`. */
  onEditChip?: (id: string, anchor: HTMLElement) => void
  /** Replaces the `onRemoveChip` calls Clear makes for each unlocked chip. */
  onClear?: () => void
  /** The field being given a value, such as "Venue is", shown after the chips. */
  pendingChip?: { id: string; label: string }
  /** Backspace on an empty field or Escape, while a chip is pending. */
  onPendingChipCancel?: () => void
  inputValue?: string
  defaultInputValue?: string
  onInputValueChange?: (value: string) => void
  /** Suggestions for the text, in the order shown: filters first, then fields. */
  suggest: (
    inputValue: string
  ) =>
    | readonly QueryFieldSuggestionGroup<Value>[]
    | Promise<readonly QueryFieldSuggestionGroup<Value>[]>
  /** A suggestion was taken, or Enter searched the free text (`kind: 'search'`). */
  onAccept?: (suggestion: QueryFieldAccepted<Value>) => void
  /** Shown above the fields while the field is empty. */
  recent?: readonly QueryFieldSuggestion<Value>[]
  /** @default 'Search and filter' */
  placeholder?: string
  /** A key that focuses the field from anywhere on the page, such as `/`. Ignored while typing elsewhere. */
  shortcut?: string
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle'
  /** Inherits from `Field` when omitted. */
  invalid?: boolean
  /** Inherits from `Field` when omitted. */
  disabled?: boolean
  /** Inherits from `Field` when omitted. */
  required?: boolean
  'aria-label'?: string
  className?: string
}

const DEFAULT_PLACEHOLDER = 'Search and filter'
const NO_CHIPS: readonly QueryFieldChip[] = []

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
    ) !== null
  )
}

function useShortcut(
  key: string | undefined,
  inputRef: RefObject<HTMLInputElement | null>
) {
  useEffect(() => {
    if (!key) return
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== key || event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [key, inputRef])
}

function useControlledText(
  value: string | undefined,
  defaultValue: string,
  onChange?: (value: string) => void
) {
  const [own, setOwn] = useState(defaultValue)
  const text = value ?? own
  function setText(next: string) {
    if (next === text) return
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }
  return [text, setText] as const
}

export function QueryField<Value = unknown>({
  chips = NO_CHIPS,
  onRemoveChip,
  onEditChip,
  onClear,
  pendingChip,
  onPendingChipCancel,
  inputValue,
  defaultInputValue = '',
  onInputValueChange,
  suggest,
  onAccept,
  recent,
  placeholder = DEFAULT_PLACEHOLDER,
  shortcut,
  size,
  emphasis,
  invalid,
  disabled,
  required,
  'aria-label': ariaLabel,
  className
}: QueryFieldProps<Value>) {
  const field = useFieldContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const chipElements = useRef(new Map<string, HTMLElement>())
  const [text, setText] = useControlledText(
    inputValue,
    defaultInputValue,
    onInputValueChange
  )
  const [open, setOpen] = useState(false)
  const [keyboardHighlight, setKeyboardHighlight] =
    useState<QueryFieldAccepted<Value>>()
  useShortcut(shortcut, inputRef)

  const ordered = useMemo(
    () => [
      ...chips.filter((chip) => chip.locked),
      ...chips.filter((chip) => !chip.locked)
    ],
    [chips]
  )
  const unlocked = ordered.filter((chip) => !chip.locked)
  const groups = useSuggestions(suggest, text, open, pendingChip?.id)
  const list = listGroups({
    groups,
    inputValue: text,
    recent,
    pending: !!pendingChip
  })
  const exact = exactSuggestion(groups)
  const search = list.find((group) => group.id === 'search')?.items[0]
  const enterTarget = keyboardHighlight ?? exact ?? search

  const isDisabled = disabled ?? field.disabled
  const isInvalid = invalid ?? field.invalid

  function accept(suggestion: QueryFieldAccepted<Value>) {
    if (suggestion.kind !== 'search') setText('')
    if (suggestion.kind !== 'field') setOpen(false)
    onAccept?.(suggestion)
  }

  function clear() {
    setText('')
    if (onClear) onClear()
    else unlocked.forEach((chip) => onRemoveChip?.(chip.id))
    inputRef.current?.focus()
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLInputElement> & {
      preventBaseUIHandler: () => void
    }
  ) {
    const empty = event.currentTarget.value === ''
    if (event.key === 'Enter' && !keyboardHighlight) {
      event.preventBaseUIHandler()
      event.preventDefault()
      const target = exact ?? search
      if (target) accept(target)
      return
    }
    if (event.key === 'Escape' && pendingChip) {
      event.preventBaseUIHandler()
      onPendingChipCancel?.()
      return
    }
    if (event.key === 'Escape' && !open) {
      // Base UI clears every value here, scope chips included.
      event.preventBaseUIHandler()
      return
    }
    if (event.key === 'Backspace' && empty) {
      event.preventBaseUIHandler()
      if (pendingChip) {
        onPendingChipCancel?.()
        return
      }
      const last = unlocked.at(-1)
      if (last) chipElements.current.get(last.id)?.focus()
    }
  }

  function handleChipKeyDown(
    chip: QueryFieldChip,
    event: KeyboardEvent<HTMLDivElement> & { preventBaseUIHandler: () => void }
  ) {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventBaseUIHandler()
      event.preventDefault()
      if (chip.locked) return
      onRemoveChip?.(chip.id)
      inputRef.current?.focus()
      return
    }
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      onEditChip &&
      !chip.locked
    ) {
      event.preventBaseUIHandler()
      event.preventDefault()
      onEditChip(chip.id, event.currentTarget)
    }
  }

  function chipRef(id: string) {
    return (element: HTMLDivElement | null) => {
      if (element) chipElements.current.set(id, element)
      else chipElements.current.delete(id)
    }
  }

  const showShortcut =
    !!shortcut && !text && ordered.length === 0 && !pendingChip

  return (
    <Combobox
      multiple
      items={list}
      filter={null}
      value={ordered as unknown as QueryFieldAccepted<Value>[]}
      onValueChange={(next, details) => {
        details.cancel()
        if (next.length > ordered.length) {
          accept(next.at(-1) as QueryFieldAccepted<Value>)
          return
        }
        const removed = ordered.find(
          (chip) => !(next as readonly unknown[]).includes(chip)
        )
        if (removed && !removed.locked) onRemoveChip?.(removed.id)
      }}
      inputValue={text}
      onInputValueChange={(next, details) => {
        if (details.reason === 'input-change') setText(next)
      }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setKeyboardHighlight(undefined)
      }}
      onItemHighlighted={(item, details) =>
        setKeyboardHighlight(
          details.reason === 'pointer'
            ? undefined
            : (item as QueryFieldAccepted<Value> | undefined)
        )
      }
      itemToStringLabel={(item: { label: string }) => item.label}
      disabled={isDisabled}
      required={required ?? field.required}
    >
      <Combobox.InputGroup
        data-slot='query-field'
        size={size}
        emphasis={emphasis}
        aria-invalid={isInvalid || undefined}
        className={cn('group/query-field gap-2 ps-3', className)}
      >
        <MagnifyingGlassIcon
          aria-hidden
          weight='bold'
          className='size-4 shrink-0 text-subtle'
        />
        <Combobox.Chips aria-label={ordered.length > 0 ? 'Filters' : undefined}>
          {ordered.map((chip) =>
            chip.locked ? (
              <Tooltip key={chip.id}>
                <Tooltip.Trigger
                  render={(props) => (
                    <Combobox.Chip
                      {...(props as ComboboxChipProps)}
                      ref={mergeRefs(props.ref, chipRef(chip.id))}
                      data-slot='combobox-chip'
                      data-locked=''
                      aria-label={chip.label}
                      className={cn(
                        props.className,
                        'gap-1 ps-2 pe-2.5',
                        chip.intent && intentVariants[chip.intent]
                      )}
                      onKeyDown={(event) => {
                        props.onKeyDown?.(event as never)
                        handleChipKeyDown(chip, event as never)
                      }}
                    />
                  )}
                >
                  <LockSimpleIcon
                    aria-hidden
                    weight='bold'
                    className='size-3 shrink-0'
                  />
                  <Combobox.ChipLabel>{chip.label}</Combobox.ChipLabel>
                </Tooltip.Trigger>
                <Tooltip.Content>Set by this page</Tooltip.Content>
              </Tooltip>
            ) : (
              <Combobox.Chip
                key={chip.id}
                ref={chipRef(chip.id)}
                aria-label={chip.label}
                role={onEditChip ? 'button' : undefined}
                className={cn(
                  onEditChip && 'cursor-pointer',
                  chip.intent && intentVariants[chip.intent]
                )}
                onClick={
                  onEditChip
                    ? (event: MouseEvent<HTMLDivElement>) =>
                        onEditChip(chip.id, event.currentTarget)
                    : undefined
                }
                onKeyDown={(event) => handleChipKeyDown(chip, event as never)}
              >
                <Combobox.ChipLabel>{chip.label}</Combobox.ChipLabel>
                <Combobox.ChipRemove aria-label={`Remove ${chip.label}`} />
              </Combobox.Chip>
            )
          )}
          {pendingChip && (
            <span
              data-slot='query-field-pending-chip'
              className='inline-flex h-6 max-w-full min-w-0 items-center rounded-full border border-dashed border-normal px-2.5 text-sm font-medium text-subtle'
            >
              <span className='min-w-0 truncate'>{pendingChip.label}</span>
            </span>
          )}
          <Combobox.Input
            ref={inputRef}
            aria-label={ariaLabel}
            aria-invalid={isInvalid || undefined}
            aria-keyshortcuts={shortcut}
            placeholder={ordered.length > 0 || pendingChip ? '' : placeholder}
            onKeyDown={(event) => handleInputKeyDown(event as never)}
          />
        </Combobox.Chips>
        {showShortcut && (
          <Kbd
            data-slot='query-field-shortcut'
            size='sm'
            className='group-focus-within/query-field:hidden'
          >
            {shortcut}
          </Kbd>
        )}
        {(text || unlocked.length > 0) && (
          <button
            type='button'
            aria-label='Clear'
            data-slot='query-field-clear'
            className='shrink-0 cursor-pointer text-subtle hover:text-normal'
            onClick={clear}
          >
            <XIcon aria-hidden weight='bold' className='size-4' />
          </button>
        )}
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.List>
              {list.map((group) => (
                <Combobox.Group key={group.id} items={group.items}>
                  <Combobox.GroupLabel>{group.label}</Combobox.GroupLabel>
                  <Combobox.Collection>
                    {(item: QueryFieldAccepted<Value>) => (
                      <Combobox.Item key={item.id} value={item}>
                        <span className='grid min-w-0 gap-0.5'>
                          <span
                            data-slot='query-field-option-label'
                            className='truncate'
                          >
                            {item.label}
                          </span>
                          {item.kind !== 'search' && item.description && (
                            <span className='truncate text-xs text-subtle'>
                              {item.description}
                            </span>
                          )}
                        </span>
                        {enterTarget === item && (
                          <Kbd size='sm' className='text-subtle'>
                            Enter
                          </Kbd>
                        )}
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              ))}
            </Combobox.List>
            <Combobox.Empty>No suggestions</Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox>
  )
}

QueryField.displayName = 'QueryField'
