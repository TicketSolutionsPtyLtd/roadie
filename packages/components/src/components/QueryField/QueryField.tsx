'use client'

import {
  type KeyboardEvent,
  type Ref,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import type { BaseUIEvent } from '@base-ui/react/types'
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
import { useControlledText, useShortcut } from './hooks'
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
  /** A chip's remove button, Backspace on a selected chip, or Clear asks to remove it. Clear calls it once per chip, so update state functionally. */
  onRemoveChip?: (id: string) => void
  /** Gives unlocked chips an edit button: open your editor `Popover` against `anchor`, the chip. */
  onEditChip?: (id: string, anchor: HTMLElement) => void
  /** Replaces the `onRemoveChip` calls Clear makes for each unlocked chip. */
  onClear?: () => void
  /** The field being given a value, such as "Venue is", shown after the chips. */
  pendingChip?: { id: string; label: string }
  /** Backspace on an empty field or Escape, while a chip is pending. */
  onPendingChipCancel?: () => void
  /** The typed text, searched as it changes. Controlled. */
  inputValue?: string
  /** The typed text to start with. Uncontrolled. */
  defaultInputValue?: string
  /** Typing changed the text, or taking a suggestion cleared it. */
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
  /**
   * A single key, such as `/`, that focuses the field from anywhere on the
   * page. Ignored while typing in another field. Unlike `Menu.Item`'s
   * display-only `shortcut`, this binds the key.
   */
  shortcut?: string
  /** The input, for focusing it after an editor closes. Pass a stable ref. */
  inputRef?: Ref<HTMLInputElement>
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle'
  /** Inherits from `Field` when omitted. */
  invalid?: boolean
  /** Inherits from `Field` when omitted. */
  disabled?: boolean
  /** Announced as required; the field never blocks a form. Inherits from `Field` when omitted. */
  required?: boolean
  /** Names the field when it isn't inside `Field`. */
  'aria-label'?: string
  className?: string
}

const DEFAULT_PLACEHOLDER = 'Search and filter'
const NO_CHIPS: readonly QueryFieldChip[] = []

const CARET_KEYS = new Set(['Home', 'End'])

// Kind and id together, so a suggestion reusing a built-in row's id stays apart.
function itemKey(item: { kind: string; id: string }) {
  return `${item.kind}:${item.id}`
}

function groupKey(group: { id: string; builtIn?: boolean }) {
  return `${group.builtIn ? 'built-in' : 'suggested'}:${group.id}`
}

function hasDescription(description: unknown) {
  return typeof description === 'number' || !!description
}

function isComposing(event: KeyboardEvent) {
  return event.nativeEvent.isComposing || event.keyCode === 229
}

function isModified(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
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
  inputRef: inputRefProp,
  size,
  emphasis,
  invalid,
  disabled,
  required,
  'aria-label': ariaLabel,
  className
}: QueryFieldProps<Value>) {
  const field = useFieldContext()
  const pendingId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputRefs = useMemo(
    () => mergeRefs(inputRef, inputRefProp),
    [inputRefProp]
  )
  const [text, setText] = useControlledText(
    inputValue,
    defaultInputValue,
    onInputValueChange
  )
  const [open, setOpen] = useState(false)
  const [highlightKey, setHighlightKey] = useState<string>()
  // Only arrows may make an item Enter's target. A list that changes under
  // the highlight re-highlights with reason `none`, so the mark lapses
  // whenever the value step starts or ends.
  const step = pendingChip?.id
  const [markedStep, setMarkedStep] = useState(step)
  const [arrowed, setArrowed] = useState(false)
  const [openingByArrow, setOpeningByArrow] = useState(false)
  if (markedStep !== step) {
    setMarkedStep(step)
    setArrowed(false)
    setOpeningByArrow(false)
  }
  const keyboardHighlightKey = arrowed ? highlightKey : undefined

  const isDisabled = disabled ?? field.disabled
  const isInvalid = invalid ?? field.invalid
  const isRequired = required ?? field.required
  useShortcut(isDisabled ? undefined : shortcut, inputRef)

  const ordered = useMemo(
    () => [
      ...chips.filter((chip) => chip.locked),
      ...chips.filter((chip) => !chip.locked)
    ],
    [chips]
  )
  const unlocked = ordered.filter((chip) => !chip.locked)
  const removable = !!(onRemoveChip || onClear)
  const suggestions = useSuggestions(suggest, text, open, pendingChip?.id)
  const list = listGroups({
    groups: suggestions.groups,
    inputValue: text,
    recent,
    pending: !!pendingChip
  })
  const exact =
    suggestions.inputValue === text
      ? exactSuggestion(suggestions.groups)
      : undefined
  const search = list
    .flatMap((group) => group.items)
    .find((item) => item.kind === 'search')
  const enterTargetKey =
    keyboardHighlightKey ??
    (exact && itemKey(exact)) ??
    (search && itemKey(search))

  const fieldDescription = field.invalid
    ? field.errorTextId
    : field.helperTextId
  const describedBy = pendingChip
    ? [field.fieldId && fieldDescription, pendingId].filter(Boolean).join(' ')
    : undefined

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

  function chipElement(id: string) {
    const group = inputRef.current?.closest('[data-slot=query-field]')
    return [
      ...(group?.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]') ??
        [])
    ].find((element) => element.dataset.chipId === id)
  }

  function edit(chip: QueryFieldChip) {
    const element = chipElement(chip.id)
    if (element) onEditChip?.(chip.id, element)
  }

  function handleInputKeyDown(
    event: BaseUIEvent<KeyboardEvent<HTMLInputElement>>
  ) {
    if (CARET_KEYS.has(event.key)) setArrowed(false)
    if (
      (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
      !isComposing(event)
    )
      setArrowed(true)
    if (event.key === 'Enter') {
      if (isModified(event)) {
        // Base UI ignores a modified Enter; keep it from submitting a form.
        event.preventDefault()
        return
      }
      if (isComposing(event)) {
        event.preventBaseUIHandler()
        return
      }
      if (keyboardHighlightKey) return
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
    if (event.key === 'Backspace' && event.currentTarget.value === '') {
      event.preventBaseUIHandler()
      if (pendingChip) {
        onPendingChipCancel?.()
        return
      }
      const last = onRemoveChip ? unlocked.at(-1) : undefined
      if (last) chipElement(last.id)?.focus()
    }
  }

  function handleChipKeyDown(
    chip: QueryFieldChip,
    event: BaseUIEvent<KeyboardEvent<HTMLDivElement>>
  ) {
    if (isDisabled) return
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
      edit(chip)
    }
  }

  const showShortcut =
    !!shortcut && !isDisabled && !text && ordered.length === 0 && !pendingChip

  return (
    <Combobox
      multiple
      // Enter searches the text unless arrowed or exact; see enterTargetKey.
      autoHighlight={false}
      items={list}
      filter={null}
      value={ordered as readonly unknown[] as QueryFieldAccepted<Value>[]}
      onValueChange={(next, details) => {
        details.cancel()
        if (next.length > ordered.length) {
          const taken = next.at(-1)
          if (taken) accept(taken)
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
      onOpenChange={(next, details) => {
        setOpen(next)
        const byArrow = next && details.reason === 'list-navigation'
        setOpeningByArrow(byArrow)
        if (details.reason !== 'list-navigation') setArrowed(false)
      }}
      onItemHighlighted={(item, details) => {
        const key = item && itemKey(item)
        setHighlightKey(key)
        if (details.reason === 'pointer') setArrowed(false)
        if (details.reason !== 'none' || openingByArrow)
          setOpeningByArrow(false)
        if (details.reason !== 'none') return
        // Opening by arrow lands on the first item; any other `none` means
        // the list changed under the highlight, which nobody arrowed to.
        const landing = openingByArrow && key !== undefined
        if (!landing && key !== highlightKey) setArrowed(false)
      }}
      itemToStringLabel={(item: { label: string }) => item.label}
      disabled={isDisabled}
    >
      <Combobox.InputGroup
        data-slot='query-field'
        size={size}
        emphasis={emphasis}
        aria-invalid={isInvalid || undefined}
        className={cn('group/query-field gap-2', className)}
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
                      data-slot='combobox-chip'
                      data-chip-id={chip.id}
                      data-locked=''
                      className={cn(
                        props.className,
                        'gap-1 ps-2 pe-2.5',
                        chip.intent && intentVariants[chip.intent]
                      )}
                      onKeyDown={(event) => {
                        props.onKeyDown?.(event)
                        handleChipKeyDown(
                          chip,
                          event as BaseUIEvent<KeyboardEvent<HTMLDivElement>>
                        )
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
                  <span className='sr-only'>, set by this page</span>
                </Tooltip.Trigger>
                <Tooltip.Content>Set by this page</Tooltip.Content>
              </Tooltip>
            ) : (
              <Combobox.Chip
                key={chip.id}
                data-chip-id={chip.id}
                aria-keyshortcuts={onEditChip ? 'Enter' : undefined}
                className={cn(chip.intent && intentVariants[chip.intent])}
                onKeyDown={(event) => handleChipKeyDown(chip, event)}
              >
                {onEditChip ? (
                  <button
                    type='button'
                    tabIndex={-1}
                    disabled={isDisabled}
                    className='inline-flex min-w-0 cursor-pointer outline-none'
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => edit(chip)}
                  >
                    <Combobox.ChipLabel>{chip.label}</Combobox.ChipLabel>
                  </button>
                ) : (
                  <Combobox.ChipLabel>{chip.label}</Combobox.ChipLabel>
                )}
                {onRemoveChip && (
                  <Combobox.ChipRemove aria-label={`Remove ${chip.label}`} />
                )}
              </Combobox.Chip>
            )
          )}
          {pendingChip && (
            <span
              id={pendingId}
              data-slot='query-field-pending-chip'
              className='inline-flex h-6 max-w-full min-w-0 items-center rounded-full border border-dashed border-normal px-2.5 text-sm font-medium text-subtle'
            >
              <span className='min-w-0 truncate'>{pendingChip.label}</span>
            </span>
          )}
          <Combobox.Input
            ref={inputRefs}
            aria-label={ariaLabel}
            aria-invalid={isInvalid || undefined}
            aria-required={isRequired || undefined}
            aria-keyshortcuts={shortcut}
            {...(describedBy && { 'aria-describedby': describedBy })}
            placeholder={ordered.length > 0 || pendingChip ? '' : placeholder}
            onKeyDown={handleInputKeyDown}
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
        {!isDisabled && (text || (removable && unlocked.length > 0)) && (
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
                <Combobox.Group key={groupKey(group)} items={group.items}>
                  <Combobox.GroupLabel>{group.label}</Combobox.GroupLabel>
                  <Combobox.Collection>
                    {(item: QueryFieldAccepted<Value>) => (
                      <Combobox.Item key={itemKey(item)} value={item}>
                        <span className='grid min-w-0 gap-0.5'>
                          <span
                            data-slot='query-field-option-label'
                            className='truncate'
                          >
                            {item.label}
                          </span>
                          {item.kind !== 'search' &&
                            hasDescription(item.description) && (
                              <span
                                data-slot='query-field-option-description'
                                className='truncate text-xs text-subtle'
                              >
                                {item.description}
                              </span>
                            )}
                        </span>
                        {enterTargetKey === itemKey(item) && (
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
            <Combobox.Empty>
              {suggestions.loading ? 'Loading suggestions' : 'No suggestions'}
            </Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox>
  )
}

QueryField.displayName = 'QueryField'
