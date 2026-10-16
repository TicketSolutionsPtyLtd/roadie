'use client'

import {
  type FocusEvent,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import type { BaseUIEvent } from '@base-ui/react/types'
import {
  LockSimpleIcon,
  MagnifyingGlassIcon,
  XIcon
} from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { intentVariants } from '../../variants'
import { Combobox, type ComboboxChipProps } from '../Combobox'
import { useFieldContext } from '../Field'
import { Kbd } from '../Kbd'
import { ToggleGroup } from '../ToggleGroup'
import { Tooltip } from '../Tooltip'
import { useControlledText, useShortcut } from './hooks'
import {
  exactSuggestion,
  firstMatch,
  leadWith,
  listGroups
} from './suggestions'
import type {
  QueryFieldAccepted,
  QueryFieldChip,
  QueryFieldOperator,
  QueryFieldPendingChip,
  QueryFieldSuggestion,
  QueryFieldSuggestionGroup
} from './types'
import { useSuggestions } from './useSuggestions'

export type QueryFieldProps<Value = unknown> = {
  /** The conditions applied, each read as one chip. Locked chips show first. */
  chips?: readonly QueryFieldChip[]
  /** A chip's remove button, Backspace on a selected chip, or Clear asks to remove it. Clear calls it once per chip, so update state functionally. */
  onRemoveChip?: (id: string) => void
  /** A click, Enter, or Space on an unlocked chip, which moves focus to the input. Start a value step with `pendingChip.chipId` naming the chip to list its values, or open an editor of your own. */
  onSelectChip?: (id: string) => void
  /**
   * Clear calls it in place of clearing the text through `onInputValueChange`
   * and removing each unlocked chip, so one update can clear both.
   */
  onClear?: () => void
  /**
   * The field being given a value, such as "Venue is", shown after the chips
   * with the input inside it. With `chipId`, it stands in that chip's place,
   * the text the step starts with is selected, taking a value keeps the list
   * open unless `onAccept` ends the step, and Backspace in the empty field
   * removes the chip. Focus
   * moving outside the field and its list, or a press outside them, ends the
   * step.
   */
  pendingChip?: QueryFieldPendingChip
  /** An operator was pressed, or Tab moved to one, while a chip is pending. */
  onPendingOperatorChange?: (operator: string) => void
  /** While a chip is pending: Backspace on an empty field, Escape, Tab out of the input, or, while a chip is edited, Enter on the text the step started with or with no new value to take. */
  onPendingChipCancel?: () => void
  /**
   * Backspace on an empty field while a chip is pending, in place of
   * removing the edited chip and `onPendingChipCancel`, such as to bring back
   * text the step set aside.
   */
  onPendingChipBackspace?: () => void
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
   * display-only `shortcut`, this binds the key. When several fields on a
   * page ask for the same key, the first one mounted takes it.
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
const NO_OPERATORS: readonly QueryFieldOperator[] = []
const NO_ITEMS: readonly never[] = []
const NOTHING_HIGHLIGHTED = { index: -1, key: undefined }

// As Combobox.Empty's, which the hint stands in for.
const EMPTY_TEXT =
  'text-center text-sm text-subtle empty:hidden [&:not(:empty)]:px-3 [&:not(:empty)]:py-4'

// Centred on the first line of 24px chips, so wrapped rows grow below it.
const FIRST_ROW = 'self-start mt-[calc(var(--combobox-chips-py)+--spacing(1))]'

const FORM_CONTROL = 'select, input, textarea'
// The input and its sizer share a cell. A touch screen keeps 16px, or a phone
// zooms in on focus.
const TYPED = '[grid-area:1/1] text-sm pointer-coarse:text-base'
const CHIP_WIDTH = 'max-w-[calc(100%-var(--spacing)*9)]'

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

function OptionIcon({ icon }: { icon: ReactNode }) {
  if (!icon) return null
  return (
    <span
      data-slot='query-field-option-icon'
      aria-hidden='true'
      className='grid shrink-0 text-subtle [&>svg]:size-4'
    >
      {icon}
    </span>
  )
}

function isComposing(event: KeyboardEvent) {
  return event.nativeEvent.isComposing || event.keyCode === 229
}

function isModified(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
}

// Out of the component, which the React Compiler can't compile with it inline.
function keyShortcuts(keys: readonly (string | false | undefined)[]) {
  return keys.filter(Boolean).join(' ') || undefined
}

export function QueryField<Value = unknown>({
  chips = NO_CHIPS,
  onRemoveChip,
  onSelectChip,
  onClear,
  pendingChip,
  onPendingOperatorChange,
  onPendingChipCancel,
  onPendingChipBackspace,
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
  // Read through a ref, so an inline callback ref attaches once.
  const inputRefProps = useRef(inputRefProp)
  useIsomorphicLayoutEffect(() => {
    inputRefProps.current = inputRefProp
  })
  const inputRefs = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node
    const ref = inputRefProps.current
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [])
  const [text, setText] = useControlledText(
    inputValue,
    defaultInputValue,
    onInputValueChange
  )
  const [open, setOpen] = useState(false)
  const [caretAtEnd, setCaretAtEnd] = useState(true)
  const [highlighted, setHighlighted] = useState<{
    index: number
    key: string | undefined
  }>(NOTHING_HIGHLIGHTED)
  const step = pendingChip?.id
  // Base UI keeps its highlight's index as the list changes under it and has
  // no way to clear it, so the list renders once with no items to drop it.
  const [drops, setDrops] = useState(0)
  const [dropped, setDropped] = useState(0)
  const unhighlighting = drops !== dropped
  useIsomorphicLayoutEffect(() => setDropped(drops), [drops])
  const dropHighlight = () => setDrops((count) => count + 1)

  const isDisabled = disabled ?? field.disabled
  const isInvalid = invalid ?? field.invalid
  const isRequired = required ?? field.required
  const ownsShortcut = useShortcut(isDisabled ? undefined : shortcut, inputRef)

  const ordered = useMemo(
    () => [
      ...chips.filter((chip) => chip.locked),
      ...chips.filter((chip) => !chip.locked)
    ],
    [chips]
  )
  const unlocked = ordered.filter((chip) => !chip.locked)
  const removable = !!(onRemoveChip || onClear)
  const editedId = pendingChip?.chipId
  const edited = editedId
    ? ordered.find((chip) => chip.id === editedId)
    : undefined
  const [listedFor, setListedFor] = useState(editedId)
  // What the edit started with, so Enter on it unchanged keeps the chip.
  const [editStart, setEditStart] = useState<string>()
  if (listedFor !== editedId) {
    setListedFor(editedId)
    setEditStart(editedId && `${pendingChip?.operator}\u0000${text}`)
    if (editedId) setOpen(true)
  }
  // Typing replaces the chip's value, and an arrow keeps it.
  useIsomorphicLayoutEffect(() => {
    if (editedId) inputRef.current?.select()
  }, [editedId])
  // A take that ends an edit, as a chip holding one value does, closes the list.
  const [takenIn, setTakenIn] = useState<string>()
  if (takenIn !== undefined) {
    setTakenIn(undefined)
    if (takenIn !== step) setOpen(false)
  }
  const popupRef = useRef<HTMLDivElement>(null)
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Read as focus lands, so a step already ended isn't ended again.
  const cancelStep = useRef<(() => void) | undefined>(undefined)
  // A press outside and the focus it moves end a step once, until focus comes
  // back or the step goes.
  const ended = useRef(false)
  useIsomorphicLayoutEffect(() => {
    cancelStep.current = pendingChip ? onPendingChipCancel : undefined
    if (!pendingChip) ended.current = false
  })
  useEffect(() => () => clearTimeout(leaving.current), [])

  const isInside = (target: EventTarget | null) => {
    const field = inputRef.current?.closest('[data-slot=query-field]')
    return [field, popupRef.current].some(
      (element) => target instanceof Node && element?.contains(target)
    )
  }
  function endStep() {
    clearTimeout(leaving.current)
    if (ended.current) return
    ended.current = true
    cancelStep.current?.()
  }
  const handleFocus = () => {
    ended.current = false
  }

  const content = pendingChip?.content
  const hasContent =
    content !== undefined && content !== null && content !== false
  useVisibleHeight(popupRef, hasContent)

  // A value step ends once focus lands on something outside the field and its
  // list, checked as it lands. Focus going nowhere, as when a phone's keyboard
  // is put away or the window loses focus, keeps it.
  function handleBlur(event: FocusEvent<HTMLElement>) {
    const { ownerDocument } = event.currentTarget
    clearTimeout(leaving.current)
    leaving.current = setTimeout(() => {
      const active = ownerDocument.activeElement
      const nowhere = !active || active === ownerDocument.body
      if (!nowhere && !isInside(active)) endStep()
    })
  }

  // Or once a press lands outside them, focusable or not.
  const stepShown = !!pendingChip
  useEffect(() => {
    const doc = inputRef.current?.ownerDocument
    if (!stepShown || !doc) return
    const press = (event: PointerEvent) => {
      if (!isInside(event.target)) endStep()
    }
    doc.addEventListener('pointerdown', press, true)
    return () => doc.removeEventListener('pointerdown', press, true)
  }, [stepShown])
  const operators = pendingChip?.operators ?? NO_OPERATORS
  const operator = pendingChip?.operator
  const showsOperators = operators.length >= 2
  // Only while they show, so Tab still leaves a closed field, and once
  // through, so Tab leaves from either end.
  const operatorAt = operators.findIndex((each) => each.value === operator)
  const operatorOnTab = (step: 1 | -1) =>
    showsOperators && open ? operators[operatorAt + step] : undefined
  const suggestions = useSuggestions(
    suggest,
    text,
    open,
    pendingChip && `${pendingChip.id}\u0000${operator ?? ''}`,
    // A value taken changes the edited chip, and so which values are ticked.
    edited && `${edited.id}\u0000${edited.label}`
  )
  const listed = listGroups({
    groups: suggestions.groups,
    inputValue: text,
    recent,
    pending: !!pendingChip
  })
  const current = suggestions.inputValue === text
  // Typed text only adds to an edited chip; a ticked row unticks, and an
  // editor opens, by arrow or click.
  const enterable = (item: QueryFieldSuggestion<Value>) =>
    !item.opensEditor && (!editedId || !item.selected)
  const exact = current
    ? exactSuggestion(suggestions.groups, enterable)
    : undefined
  const typedValue =
    current && pendingChip && text.trim()
      ? firstMatch(suggestions.groups, enterable)
      : undefined
  const search = listed
    .flatMap((group) => group.items)
    .find((item) => item.kind === 'search')
  // What Enter takes with nothing moved to.
  const enterDefault = exact ?? typedValue ?? search
  const defaultKey = enterDefault && itemKey(enterDefault)
  // The default leads and Base UI highlights the first row, so Enter takes it
  // and Down moves to what else there is.
  const list = leadWith(listed, (item) => itemKey(item) === defaultKey)
  const items = list.flatMap((group) => group.items)
  // Held through the render that still lists the last text's suggestions, or
  // each key typed in a value step would drop the highlight and set it again.
  const settled = current || suggestions.loading
  const [defaulted, setDefaulted] = useState(false)
  if (settled && defaulted !== !!enterDefault) {
    setDefaulted(!!enterDefault)
    if (defaulted) dropHighlight()
  }
  const highlightsDefault = settled ? !!enterDefault : defaulted
  // Also once typed text leaves Enter nothing, such as a value already ticked.
  const stuck = current && !!text.trim() && !enterDefault
  const hint =
    !suggestions.loading && (list.length === 0 || stuck) && pendingChip?.hint
  // Asked for suggestions, but with none, nothing to type, no hint, and no
  // operators to switch to, a list would only say No suggestions.
  const nothingToShow =
    list.length === 0 &&
    !hint &&
    !showsOperators &&
    !hasContent &&
    !suggestions.loading &&
    !text.trim()
  const shown = open && !nothingToShow
  // Rows unmount too, or Base UI loses track of the ones that come back.
  const rows = unhighlighting ? NO_ITEMS : list
  const groupStarts = list.map((_, index) =>
    list.slice(0, index).reduce((sum, group) => sum + group.items.length, 0)
  )

  const fieldDescription = field.invalid
    ? field.errorTextId
    : field.helperTextId
  const describedBy = pendingChip
    ? [field.fieldId && fieldDescription, pendingId].filter(Boolean).join(' ')
    : undefined

  function accept(suggestion: QueryFieldAccepted<Value>) {
    const left =
      suggestion.kind === 'search' ? '' : (suggestion.remainder ?? '')
    if (suggestion.kind !== 'search') setText(left)
    if (suggestion.kind === 'field' || left !== text) dropHighlight()
    // Words left over list their own suggestions.
    if (suggestion.kind !== 'field' && !editedId && !left.trim()) setOpen(false)
    if (editedId) setTakenIn(step)
    onAccept?.(suggestion)
  }

  function clear() {
    if (pendingChip) onPendingChipCancel?.()
    if (onClear) {
      setText('', { silent: true })
      onClear()
    } else {
      setText('')
      unlocked.forEach((chip) => onRemoveChip?.(chip.id))
    }
    inputRef.current?.focus()
  }

  function chipElement(id: string) {
    const group = inputRef.current?.closest('[data-slot=query-field]')
    return [
      ...(group?.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]') ??
        [])
    ].find((element) => element.dataset.chipId === id)
  }

  function select(chip: QueryFieldChip) {
    onSelectChip?.(chip.id)
    inputRef.current?.focus()
    // A new step opens the list as it starts; the same chip's only reopens it.
    if (chip.id === editedId) setOpen(true)
  }

  function handleInputKeyDown(
    event: BaseUIEvent<KeyboardEvent<HTMLInputElement>>
  ) {
    const tab =
      event.key === 'Tab' &&
      !(event.metaKey || event.ctrlKey || event.altKey) &&
      !isComposing(event)
    const tabbedOperator = tab
      ? operatorOnTab(event.shiftKey ? -1 : 1)
      : undefined
    if (tabbedOperator) {
      event.preventBaseUIHandler()
      event.preventDefault()
      onPendingOperatorChange?.(tabbedOperator.value)
      return
    }
    // Ended here, as Tab may land on Clear, still inside the field.
    if (tab && pendingChip) {
      endStep()
      return
    }
    // The edited chip's text holds the caret; Escape first to move to a chip.
    if (edited && (event.key === 'ArrowLeft' || event.key === 'ArrowRight'))
      event.preventBaseUIHandler()
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
      const unchanged =
        !!text.trim() && editStart === `${operator}\u0000${text}`
      // Base UI takes the highlighted row, unless it's the default for the
      // text an edit started with.
      const takesDefault = highlighted.key === defaultKey
      if (shown && highlighted.index >= 0 && !(unchanged && takesDefault))
        return
      event.preventBaseUIHandler()
      event.preventDefault()
      // With the list closed, as after Escape, Enter still takes the default.
      if (enterDefault && !unchanged) accept(enterDefault)
      // Nothing new to take means done, unless typed text matched no value,
      // when the hint says what to type, or its values are still on their way.
      else if (
        editedId &&
        (unchanged || (current && (items.length > 0 || !text.trim())))
      ) {
        setOpen(false)
        onPendingChipCancel?.()
      }
      return
    }
    // Ends the composition only: the page, such as a toolbar, never hears it.
    if (event.key === 'Escape' && isComposing(event)) {
      event.preventBaseUIHandler()
      event.stopPropagation()
      return
    }
    // An Escape used here is kept from the page, such as a toolbar's.
    if (event.key === 'Escape' && pendingChip) {
      event.preventBaseUIHandler()
      event.preventDefault()
      onPendingChipCancel?.()
      return
    }
    if (event.key === 'Escape' && !open) {
      // Base UI clears every value here, scope chips included.
      event.preventBaseUIHandler()
      if (text) {
        event.preventDefault()
        setText('')
      }
      return
    }
    if (event.key === 'Backspace' && event.currentTarget.value === '') {
      event.preventBaseUIHandler()
      if (pendingChip && onPendingChipBackspace) {
        // Or the text it may bring back loses a character.
        event.preventDefault()
        onPendingChipBackspace()
        return
      }
      if (pendingChip) {
        if (edited && !edited.locked) onRemoveChip?.(edited.id)
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
      onSelectChip &&
      !chip.locked
    ) {
      event.preventBaseUIHandler()
      event.preventDefault()
      select(chip)
    }
  }

  const showShortcut =
    ownsShortcut && !text && ordered.length === 0 && !pendingChip

  const inChip = !!pendingChip
  const target =
    shown && highlighted.index >= 0 ? items[highlighted.index] : enterDefault
  // The rest of what Enter takes, after the caret, for text it starts with.
  const ghost =
    inChip &&
    caretAtEnd &&
    current &&
    text &&
    target?.label.toLowerCase().startsWith(text.toLowerCase())
      ? target.label.slice(text.length)
      : ''
  // The edited chip's stand-in takes its place among them, by order, so the
  // input never moves in the DOM, which would blur it.
  const editedAt = edited ? ordered.indexOf(edited) : -1
  const orderOf = (index: number) =>
    editedAt >= 0 ? { style: { order: index } } : undefined
  const input = (
    <Combobox.Input
      ref={inputRefs}
      aria-label={ariaLabel}
      aria-invalid={isInvalid || undefined}
      aria-required={isRequired || undefined}
      aria-keyshortcuts={keyShortcuts([
        ownsShortcut && shortcut,
        operatorOnTab(1) && 'Tab',
        operatorOnTab(-1) && 'Shift+Tab'
      ])}
      {...(describedBy && { 'aria-describedby': describedBy })}
      placeholder={ordered.length > 0 || pendingChip ? '' : placeholder}
      // In the step's chip, as wide as the text beside it, so the chip hugs
      // it. Otherwise a chip leaves it a few characters and the gap beside it,
      // so it wraps to a row of its own only after a chip that doesn't
      // truncate.
      className={cn(inChip ? cn(TYPED, 'w-0 min-w-full') : 'min-w-8')}
      onKeyDown={handleInputKeyDown}
      onSelect={(event) => {
        const { selectionStart, selectionEnd, value } = event.currentTarget
        setCaretAtEnd(
          selectionStart === selectionEnd && selectionEnd === value.length
        )
      }}
    />
  )

  return (
    <Combobox
      multiple
      autoHighlight={highlightsDefault && 'always'}
      items={rows}
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
      open={shown}
      onOpenChange={setOpen}
      onItemHighlighted={(item, details) => {
        const key = item && itemKey(item)
        // A row moved to that newer suggestions replace goes back to the
        // default, which Base UI would leave on whatever row took its place.
        const replaced =
          details.reason === 'none' &&
          details.index > 0 &&
          details.index === highlighted.index &&
          key !== highlighted.key
        if (replaced) dropHighlight()
        // The search row is a new object each render, which Base UI reports.
        setHighlighted((last) =>
          last.index === details.index && last.key === key
            ? last
            : { index: details.index, key }
        )
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
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <MagnifyingGlassIcon
          aria-hidden
          weight='bold'
          className={cn('size-4 shrink-0 text-subtle', FIRST_ROW)}
        />
        <Combobox.Chips aria-label={ordered.length > 0 ? 'Filters' : undefined}>
          {ordered.map((chip, index) => {
            const tooltip = chip.locked ? (
              <span className='grid'>
                {chip.description && <span>{chip.description}</span>}
                <span>Set by this page</span>
              </span>
            ) : (
              chip.description
            )
            const selectable = !!onSelectChip && !chip.locked
            const content = (
              <>
                {chip.locked && (
                  <LockSimpleIcon
                    aria-hidden
                    weight='bold'
                    className='size-3 shrink-0'
                  />
                )}
                {selectable ? (
                  <button
                    type='button'
                    tabIndex={-1}
                    disabled={isDisabled}
                    className='inline-flex min-w-0 cursor-pointer outline-none'
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(chip)}
                  >
                    <Combobox.ChipLabel>{chip.label}</Combobox.ChipLabel>
                  </button>
                ) : (
                  <Combobox.ChipLabel>{chip.label}</Combobox.ChipLabel>
                )}
                {(chip.locked || chip.description) && (
                  <span className='sr-only'>
                    {chip.locked && ', set by this page'}
                    {chip.description && `, ${chip.description}`}
                  </span>
                )}
                {onRemoveChip && !chip.locked && (
                  <Combobox.ChipRemove aria-label={`Remove ${chip.label}`} />
                )}
              </>
            )
            const renderChip = (props: ComboboxChipProps) => (
              <Combobox.Chip
                {...props}
                data-slot='combobox-chip'
                data-chip-id={chip.id}
                data-locked={chip.locked ? '' : undefined}
                aria-keyshortcuts={selectable ? 'Enter' : undefined}
                selected={chip.id === editedId}
                {...orderOf(index)}
                className={cn(
                  props.className,
                  CHIP_WIDTH,
                  chip.id === editedId && 'hidden',
                  chip.locked && 'gap-1 ps-2',
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
            )
            return tooltip ? (
              <Tooltip key={chip.id}>
                <Tooltip.Trigger
                  render={(props) => renderChip(props as ComboboxChipProps)}
                >
                  {content}
                </Tooltip.Trigger>
                <Tooltip.Content>{tooltip}</Tooltip.Content>
              </Tooltip>
            ) : (
              <Fragment key={chip.id}>
                {renderChip({ children: content })}
              </Fragment>
            )
          })}
          {/* Always rendered, so the input never remounts and keeps focus as a
              step starts. What's typed sits inside the step's chip. */}
          <span
            data-slot={inChip ? 'query-field-pending-chip' : undefined}
            {...orderOf(editedAt)}
            className={cn(
              inChip
                ? 'flex h-6 max-w-full min-w-0 items-center gap-1 rounded-full border border-dashed border-normal ps-2.5 pe-2'
                : 'contents'
            )}
          >
            {inChip && (
              <span
                id={pendingId}
                // A description's change isn't read, so the operator's is live.
                aria-live='polite'
                className='min-w-0 truncate text-sm font-medium text-subtle pointer-coarse:text-base'
              >
                {pendingChip.label}
              </span>
            )}
            <span // The label truncates first; what's typed scrolls only once it fills the chip.
              className={cn(
                inChip ? 'inline-grid max-w-full min-w-1 shrink-0' : 'contents'
              )}
            >
              {input}
              {/* Sizes the input to its text without field-sizing, which not
                  every browser has, and lines the rest up after the caret. */}
              {inChip && (
                <span
                  aria-hidden
                  className={cn(
                    TYPED,
                    'pointer-events-none invisible min-w-1 overflow-hidden pe-0.5 whitespace-pre'
                  )}
                >
                  {text}
                  {/* Drawn from an attribute, so typing adds and removes no
                      nodes, which would restyle a page's :has() anchors. */}
                  <span
                    data-slot='query-field-ghost'
                    data-ghost={ghost}
                    className='visible text-subtler before:content-[attr(data-ghost)]'
                  />
                </span>
              )}
            </span>
          </span>
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
        {!isDisabled &&
          (text || pendingChip || (removable && unlocked.length > 0)) && (
            <button
              type='button'
              aria-label='Clear'
              data-slot='query-field-clear'
              // Round and a chip's height, its margins keeping the icon's footprint.
              className='is-interactive -mx-1 mt-(--combobox-chips-py) grid size-6 shrink-0 place-items-center self-start rounded-full emphasis-subtler text-subtle'
              onClick={clear}
            >
              <XIcon aria-hidden weight='bold' className='size-4' />
            </button>
          )}
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup
            ref={popupRef}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              // Under the field exactly, so rows truncate rather than spill past it.
              'w-(--anchor-width)',
              hasContent &&
                'max-h-[min(var(--available-height),var(--query-field-visible-height,100dvh))]'
            )}
          >
            {showsOperators && (
              <div
                data-slot='query-field-operators'
                className='sticky -top-1 z-1 -mx-1 -mt-1 grid bg-raised p-1'
              >
                <ToggleGroup
                  aria-label='Operator'
                  size='md'
                  emphasis='subtler'
                  value={operator === undefined ? [] : [operator]}
                  onValueChange={([next]) => {
                    if (next !== undefined) onPendingOperatorChange?.(next)
                  }}
                  // Focus stays in the input, so typing and Tab carry on there.
                  onMouseDown={(event) => event.preventDefault()}
                  // Words of very different lengths, so equal columns leave gaps.
                  className='auto-cols-max justify-self-start'
                >
                  {operators.map((each) => (
                    <ToggleGroup.Item
                      key={each.value}
                      value={each.value}
                      aria-label={each['aria-label']}
                      tabIndex={-1}
                      className='min-w-8'
                    >
                      {each.label}
                    </ToggleGroup.Item>
                  ))}
                </ToggleGroup>
              </div>
            )}
            <Combobox.List>
              {rows.map((group, groupIndex) => (
                <Combobox.Group key={groupKey(group)} items={group.items}>
                  <Combobox.GroupLabel
                    // The operators stand in the first label; it still names
                    // the group. The label's own padding would outsize sr-only.
                    className={cn(
                      showsOperators && groupIndex === 0 && 'sr-only p-0'
                    )}
                  >
                    {group.label}
                  </Combobox.GroupLabel>
                  <Combobox.Collection>
                    {(item: QueryFieldAccepted<Value>, index: number) => (
                      <Combobox.Item
                        key={itemKey(item)}
                        value={item}
                        // Chips hold the field's value, so Base UI never selects a row.
                        aria-selected={
                          item.kind !== 'search' && !!item.selected
                        }
                      >
                        <OptionIcon
                          icon={
                            item.kind === 'search' ? (
                              <MagnifyingGlassIcon weight='bold' />
                            ) : (
                              item.icon
                            )
                          }
                        />
                        <span className='me-auto grid min-w-0 gap-0.5'>
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
                        {groupStarts[groupIndex]! + index ===
                          highlighted.index && (
                          <Kbd size='sm' className='text-subtle'>
                            Enter
                          </Kbd>
                        )}
                        {item.kind !== 'search' && item.selected && (
                          <Combobox.ItemIndicator keepMounted />
                        )}
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              ))}
            </Combobox.List>
            <ComboboxPrimitive.Status
              data-slot='query-field-hint'
              className={EMPTY_TEXT}
            >
              {hint}
            </ComboboxPrimitive.Status>
            <Combobox.Empty>
              {!unhighlighting &&
                (suggestions.loading
                  ? 'Loading suggestions'
                  : !hint && !hasContent && 'No suggestions')}
            </Combobox.Empty>
            {hasContent && (
              <div
                data-slot='query-field-content'
                // Focus stays in the input, as it does for the operators, but
                // a native control such as a month select needs it to open.
                onMouseDown={(event) => {
                  if (!(event.target as Element).closest(FORM_CONTROL))
                    event.preventDefault()
                }}
                onChange={() => inputRef.current?.focus()}
                // A press that ends the step closes the list, as a take does.
                onClick={() => setTakenIn(step)}
                className='grid p-1'
              >
                {content}
              </div>
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox>
  )
}

QueryField.displayName = 'QueryField'

/**
 * Sets `--query-field-visible-height` on the popup to the room between its
 * top and the visual viewport's bottom, which an on-screen keyboard raises
 * while the layout viewport, and so `--available-height`, stays put.
 */
function useVisibleHeight(
  popupRef: { current: HTMLElement | null },
  active: boolean
) {
  useEffect(() => {
    const viewport = window.visualViewport
    const popup = popupRef.current
    if (!active || !viewport || !popup) return
    const fit = () => {
      const bottom = viewport.offsetTop + viewport.height
      const room = bottom - popup.getBoundingClientRect().top - 8
      popup.style.setProperty('--query-field-visible-height', `${room}px`)
    }
    fit()
    // Again once the popup is placed.
    const placed = requestAnimationFrame(fit)
    viewport.addEventListener('resize', fit)
    viewport.addEventListener('scroll', fit)
    return () => {
      cancelAnimationFrame(placed)
      viewport.removeEventListener('resize', fit)
      viewport.removeEventListener('scroll', fit)
      popup.style.removeProperty('--query-field-visible-height')
    }
  }, [popupRef, active])
}
