'use client'

import { useEffect, useRef, useState } from 'react'

import { PlusIcon, TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react'

import { Button, IconButton } from '@oztix/roadie-components/button'
import { Collapsible } from '@oztix/roadie-components/collapsible'
import { Field } from '@oztix/roadie-components/field'
import { Fieldset } from '@oztix/roadie-components/fieldset'
import { Select } from '@oztix/roadie-components/select'
import { Sortable } from '@oztix/roadie-components/sortable'
import { isUnsafeHref } from '@oztix/roadie-core/utils'

import type { EditorSetting } from '../extensions'
import { isSafeImageSrc } from '../schema/imageSrc'
import { EditorChoice } from './EditorChoice'

type Attrs = Record<string, unknown>

/** Uploads an image, as the editor's `onUploadImage` does. */
export type UploadSettingImage = (
  file: File
) => Promise<{ src: string; alt?: string }>

// Up to three fit side by side in the drawer.
const MAX_BUTTONS = 3

const textOf = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''

const recordOf = (value: unknown): Attrs =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Attrs)
    : {}

type FieldProps = {
  setting: EditorSetting
  value: unknown
  onValueChange: (value: unknown) => void
  onDone: () => void
  /** Its place in the block's attrs, such as `cards.1.title`. */
  path: string
  /** The setting to open the way to, such as a card's title clicked on. */
  focusPath?: string
  uploadImage?: UploadSettingImage
}

const onEnter = (onDone: () => void) => (event: React.KeyboardEvent) => {
  // The Enter that picks an IME candidate only ends the composition.
  const composing = event.nativeEvent.isComposing || event.keyCode === 229
  if (event.key !== 'Enter' || composing) return
  event.preventDefault()
  onDone()
}

type TextInputProps = {
  label: string
  path: string
  value: string
  onValueChange: (value: string) => void
  onDone: () => void
  helperText?: string
  invalid?: boolean
  error?: string
  multiline?: boolean
}

function TextInput({
  label,
  path,
  value,
  onValueChange,
  onDone,
  helperText,
  invalid,
  error,
  multiline
}: TextInputProps) {
  return (
    <Field invalid={invalid}>
      <Field.Label>{label}</Field.Label>
      {multiline ? (
        <Field.Textarea
          data-setting={path}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
      ) : (
        <Field.Input
          data-setting={path}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={onEnter(onDone)}
        />
      )}
      {helperText ? <Field.HelperText>{helperText}</Field.HelperText> : null}
      {error ? <Field.ErrorText>{error}</Field.ErrorText> : null}
    </Field>
  )
}

type PartProps = Omit<FieldProps, 'setting'> & { label: string }

/** An image: a link or an upload, and its alt text. */
function ImageFields({
  label,
  value,
  onValueChange,
  onDone,
  path,
  uploadImage
}: PartProps) {
  const image = recordOf(value)
  const [src, setSrc] = useState(textOf(image.src))
  const [uploading, setUploading] = useState(false)
  const [failed, setFailed] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // An upload ends after other edits, so it applies to the latest value.
  const latest = useRef({ image, onValueChange })
  useEffect(() => {
    latest.current = { image, onValueChange }
  })
  const mounted = useRef(true)
  // Set again on each mount, as StrictMode mounts twice.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const refused = src !== '' && !isSafeImageSrc(src)
  const change = (next: Attrs) => onValueChange({ ...image, ...next })
  return (
    <Fieldset className='grid gap-3 [&>*+*]:mt-0'>
      {/* A legend sits outside the fieldset's grid, so gap misses it. */}
      <Fieldset.Legend className='mb-1.5 text-sm font-medium text-normal'>
        {label}
      </Fieldset.Legend>
      {isSafeImageSrc(image.src) ? (
        <img
          src={image.src}
          alt=''
          className='max-h-32 w-full rounded-lg bg-subtle object-contain'
        />
      ) : null}
      <TextInput
        label='Image address'
        path={`${path}.src`}
        value={src}
        onValueChange={(next) => {
          setSrc(next)
          // Applies once it can load, so a half-pasted link shows nothing.
          if (next === '' || isSafeImageSrc(next)) {
            change({ src: next, width: undefined, height: undefined })
          }
        }}
        onDone={onDone}
        invalid={refused}
        error='Use an https link, or a path on this site.'
      />
      {uploadImage ? (
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            size='sm'
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <UploadSimpleIcon weight='bold' className='size-4' aria-hidden />
            {uploading ? 'Uploading…' : 'Upload an image'}
          </Button>
          {failed ? (
            <p role='alert' className='text-sm text-subtle intent-danger'>
              That image couldn’t be uploaded. Try again, or paste a link.
            </p>
          ) : null}
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            hidden
            aria-label={`${label} file`}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              setUploading(true)
              setFailed(false)
              uploadImage(file)
                .then((uploaded) => {
                  // The drawer closed, or moved to another block, meanwhile.
                  if (!mounted.current) return
                  const { image: now, onValueChange: apply } = latest.current
                  setSrc(uploaded.src)
                  apply({
                    ...now,
                    src: uploaded.src,
                    alt: uploaded.alt ?? textOf(now.alt),
                    width: undefined,
                    height: undefined
                  })
                })
                .catch(() => {
                  if (mounted.current) setFailed(true)
                })
                .finally(() => {
                  if (mounted.current) setUploading(false)
                })
            }}
          />
        </div>
      ) : null}
      <TextInput
        label='Alt text'
        path={`${path}.alt`}
        value={textOf(image.alt)}
        onValueChange={(alt) => change({ alt })}
        onDone={onDone}
        helperText='What a screen reader says, and what shows if it doesn’t load.'
      />
    </Fieldset>
  )
}

/** A link with its label, such as a button. */
function ActionFields({
  label,
  value,
  onValueChange,
  onDone,
  path
}: PartProps) {
  const action = recordOf(value)
  const [href, setHref] = useState(textOf(action.href))
  const change = (next: Attrs) => onValueChange({ ...action, ...next })
  return (
    <Fieldset className='grid gap-3 [&>*+*]:mt-0'>
      {/* A legend sits outside the fieldset's grid, so gap misses it. */}
      <Fieldset.Legend className='mb-1.5 text-sm font-medium text-normal'>
        {label}
      </Fieldset.Legend>
      <TextInput
        label='Label'
        path={`${path}.label`}
        value={textOf(action.label)}
        onValueChange={(next) => change({ label: next })}
        onDone={onDone}
      />
      <TextInput
        label='Link'
        path={`${path}.href`}
        value={href}
        onValueChange={(next) => {
          setHref(next)
          if (!isUnsafeHref(next)) change({ href: next })
        }}
        onDone={onDone}
        invalid={isUnsafeHref(href)}
        error='This link can’t be used.'
      />
    </Fieldset>
  )
}

type ListSetting = Extract<EditorSetting, { type: 'list' }>

let nextKey = 0
const newKey = () => `item-${(nextKey += 1)}`

// An item's name in its fold: its first text, or its place in the list.
function itemText(setting: ListSetting, item: unknown, index: number) {
  const fields = setting.fields ?? []
  const record = recordOf(item)
  const named =
    setting.item === 'action'
      ? record.label
      : setting.item === 'image'
        ? record.alt
        : fields
            .filter(({ type }) => type === 'text')
            .map(({ name }) => record[name])
            .find((text) => textOf(text).trim() !== '')
  const text = textOf(named).trim()
  return text || `${setting.itemLabel} ${index + 1}`
}

// Two items can share text, so a repeat takes its place to tell them apart.
function itemTitle(setting: ListSetting, items: unknown[], index: number) {
  const text = itemText(setting, items[index], index)
  const repeated = items.some(
    (other, at) => at !== index && itemText(setting, other, at) === text
  )
  return repeated ? `${text} (${index + 1})` : text
}

function blankItem(setting: ListSetting): unknown {
  if (setting.item === 'image') return { src: '', alt: '' }
  if (setting.item === 'action') return { label: '', href: '' }
  return Object.fromEntries(
    (setting.fields ?? []).flatMap(({ name, type }) =>
      type === 'text' ? [[name, '']] : []
    )
  )
}

type ListFieldProps = Omit<FieldProps, 'setting'> & { setting: ListSetting }

/** Items to add, remove, reorder by drag or menu, and edit in their folds. */
function ListField({
  setting,
  value,
  onValueChange,
  onDone,
  path,
  focusPath,
  uploadImage
}: ListFieldProps) {
  const items = Array.isArray(value) ? value : []
  // Items have no ids, so the drawer keeps its own, in step with their order.
  const [keys, setKeys] = useState(() => items.map(newKey))
  const opened = focusPath?.startsWith(`${path}.`)
    ? Number(focusPath.slice(path.length + 1).split('.')[0])
    : null
  // A new item takes focus at its first field, so typing fills it in rather
  // than pressing Add again.
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusKey) return
    listRef.current
      ?.querySelector<HTMLElement>(
        `[data-item="${CSS.escape(focusKey)}"] :is(input:not([type=hidden]), textarea)`
      )
      ?.focus()
    setFocusKey(null)
  }, [focusKey])
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(opened === null ? [] : [keys[opened] ?? ''])
  )
  // Changed from outside, so its keys start again, once.
  if (keys.length !== items.length) setKeys(items.map(newKey))
  const shown = keys.length === items.length ? keys : items.map(() => '')
  const full = setting.max !== undefined && items.length >= setting.max

  const update = (next: unknown[], nextKeys: string[]) => {
    setKeys(nextKeys)
    onValueChange(next)
  }
  const add = () => {
    const key = newKey()
    setFocusKey(key)
    setOpen((current) => new Set([...current, key]))
    update([...items, blankItem(setting)], [...shown, key])
  }
  const remove = (index: number) =>
    update(
      items.filter((_, at) => at !== index),
      shown.filter((_, at) => at !== index)
    )
  const changeItem = (index: number, item: unknown) =>
    onValueChange(items.map((current, at) => (at === index ? item : current)))

  return (
    <Fieldset className='grid gap-2 [&>*+*]:mt-0'>
      {/* A legend sits outside the fieldset's grid, so gap misses it. */}
      <Fieldset.Legend className='mb-1.5 text-sm font-medium text-normal'>
        {setting.label}
      </Fieldset.Legend>
      <Sortable
        items={shown}
        label={setting.label.toLowerCase()}
        onReorder={(nextKeys) =>
          update(
            nextKeys.map((key) => items[shown.indexOf(key)]),
            nextKeys
          )
        }
      >
        <div ref={listRef} className='grid gap-2'>
          {items.map((item, index) => {
            const key = shown[index]!
            const title = itemTitle(setting, items, index)
            const itemPath = `${path}.${index}`
            return (
              <Sortable.Item
                key={key}
                value={key}
                label={title}
                data-item={key}
                className='grid emphasis-normal rounded-lg'
              >
                <Collapsible
                  open={open.has(key)}
                  onOpenChange={(next) =>
                    setOpen((current) => {
                      const changed = new Set(current)
                      if (next) changed.add(key)
                      else changed.delete(key)
                      return changed
                    })
                  }
                >
                  <div className='flex items-center gap-1 p-1'>
                    <Sortable.Handle size='xs' />
                    <Collapsible.Trigger className='min-w-0 flex-1 truncate text-start text-sm'>
                      {title}
                    </Collapsible.Trigger>
                    <IconButton
                      size='xs'
                      emphasis='subtler'
                      aria-label={`Remove ${title}`}
                      onClick={() => remove(index)}
                    >
                      <TrashIcon weight='bold' className='size-4' aria-hidden />
                    </IconButton>
                  </div>
                  <Collapsible.Panel>
                    <div className='grid gap-3 px-3 pt-1 pb-3'>
                      {setting.item ? (
                        <SettingField
                          setting={{
                            name: String(index),
                            label: title,
                            type: setting.item
                          }}
                          value={item}
                          onValueChange={(next) => changeItem(index, next)}
                          onDone={onDone}
                          path={itemPath}
                          uploadImage={uploadImage}
                        />
                      ) : (
                        (setting.fields ?? []).map((field) => (
                          <SettingField
                            key={field.name}
                            setting={field}
                            value={recordOf(item)[field.name]}
                            onValueChange={(next) =>
                              changeItem(index, {
                                ...recordOf(item),
                                [field.name]: next
                              })
                            }
                            onDone={onDone}
                            path={`${itemPath}.${field.name}`}
                            focusPath={focusPath}
                            uploadImage={uploadImage}
                          />
                        ))
                      )}
                    </div>
                  </Collapsible.Panel>
                </Collapsible>
              </Sortable.Item>
            )
          })}
        </div>
      </Sortable>
      <div className='flex'>
        <Button size='sm' emphasis='subtle' disabled={full} onClick={add}>
          <PlusIcon weight='bold' className='size-4' aria-hidden />
          Add {setting.itemLabel.toLowerCase()}
        </Button>
      </div>
    </Fieldset>
  )
}

/** One setting as the drawer edits it: a field, or a group of them. */
export function SettingField(props: FieldProps) {
  const { setting, value, onValueChange, onDone, path } = props
  switch (setting.type) {
    case 'list':
      return <ListField {...props} setting={setting} />
    case 'image':
      return <ImageFields {...props} label={setting.label} />
    case 'action':
      return <ActionFields {...props} label={setting.label} />
    case 'choice':
      if (setting.options.length <= MAX_BUTTONS) {
        return (
          <EditorChoice
            legend={setting.label}
            choices={setting.options}
            value={textOf(value ?? setting.defaultValue)}
            onValueChange={onValueChange}
            helperText={setting.helperText}
          />
        )
      }
      return (
        <Field>
          <Field.Label>{setting.label}</Field.Label>
          <Select
            value={textOf(value ?? setting.defaultValue)}
            onValueChange={(chosen) => {
              if (typeof chosen === 'string') onValueChange(chosen)
            }}
            items={setting.options}
          >
            <Select.Trigger data-setting={path}>
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content>
              {setting.options.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          {setting.helperText ? (
            <Field.HelperText>{setting.helperText}</Field.HelperText>
          ) : null}
        </Field>
      )
    default:
      return (
        <TextInput
          label={setting.label}
          path={path}
          value={textOf(value)}
          onValueChange={onValueChange}
          onDone={onDone}
          helperText={setting.helperText}
          multiline={setting.multiline}
        />
      )
  }
}
