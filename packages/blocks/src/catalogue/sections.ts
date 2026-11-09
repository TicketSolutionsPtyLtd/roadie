import { type ComponentType, type ReactNode, createElement } from 'react'

import { type BlockPreset, type CatalogueBlock, catalogue } from '.'
import type { AlternatingRowsProps } from '../AlternatingRows'
import type { CallToActionProps } from '../CallToAction'
import type { CardsProps } from '../Cards'
import type { FAQProps } from '../FAQ'
import type { GalleryProps } from '../Gallery'
import type { HeroProps } from '../Hero'
import type { MosaicProps } from '../Mosaic'
import type { RichTextProps } from '../RichText'
import type { SideBySideProps } from '../SideBySide'
import type { StatsProps } from '../Stats'
import type { TestimonialProps } from '../Testimonial'
import { EditingImages } from './EditingImages'
import { PLACEHOLDER_IMAGE } from './placeholder'

type Attrs = Record<string, unknown>

/** The blocks an editor offers as sections, each its component, by catalogue name. */
export type CatalogueComponents = {
  'alternating-rows'?: ComponentType<AlternatingRowsProps>
  'call-to-action'?: ComponentType<CallToActionProps>
  cards?: ComponentType<CardsProps>
  faq?: ComponentType<FAQProps>
  gallery?: ComponentType<GalleryProps>
  hero?: ComponentType<HeroProps>
  mosaic?: ComponentType<MosaicProps>
  'rich-text'?: ComponentType<RichTextProps>
  'side-by-side'?: ComponentType<SideBySideProps>
  stats?: ComponentType<StatsProps>
  testimonial?: ComponentType<TestimonialProps>
}

type Option = { value: string; label: string }

/** A field a section's Settings drawer edits, as the editor's `EditorSetting`. */
export type CatalogueSetting = {
  name: string
  label: string
  helperText?: string
  available?: (attrs: Readonly<Attrs>) => boolean
} & (
  | { type: 'text'; multiline?: boolean }
  | { type: 'choice'; options: readonly Option[]; defaultValue?: string }
  | { type: 'image' }
  | { type: 'action' }
  | {
      type: 'list'
      itemLabel: string
      fields?: readonly CatalogueSetting[]
      item?: 'image' | 'action'
      max?: number
    }
)

/** A block as one of the editor's `sections`, which `EditorSection` describes. */
export type CatalogueSection = {
  name: string
  label: string
  attrs: Readonly<Attrs>
  settings: readonly CatalogueSetting[]
  render: (props: {
    attrs: Attrs
    editing?: boolean
    editingItem?: string
  }) => ReactNode
  templates: readonly {
    label: string
    thumbnail?: string
    keywords?: readonly string[]
    attrs: Readonly<Attrs>
  }[]
}

export type CatalogueSectionsOptions = {
  /** The blocks to offer, in catalogue order, so a page loads only these. */
  components: CatalogueComponents
  /**
   * Where the app serves a preset's thumbnail, from the package's
   * `thumbnails` folder. Without it, tiles show an icon.
   */
  thumbnailUrl?: (file: string) => string
  /** What a new section of a preset starts with, over the placeholder copy. */
  content?: (block: CatalogueBlock, preset: BlockPreset) => Attrs
}

type Field = {
  label: string
  helperText?: string
} & (
  | { type: 'text'; multiline?: boolean }
  | { type: 'choice'; options: readonly Option[]; defaultValue?: string }
)

// The plain fields; `partsOf` adds images, buttons and items.
const FIELDS: Readonly<Record<string, Field>> = {
  eyebrow: { label: 'Eyebrow', type: 'text' },
  title: { label: 'Title', type: 'text' },
  highlight: {
    label: 'Highlight',
    type: 'text',
    helperText: 'Words from the title to colour.'
  },
  description: { label: 'Description', type: 'text', multiline: true },
  align: {
    label: 'Align',
    type: 'choice',
    defaultValue: 'start',
    options: [
      // The plain word, as an image's and a button's alignment say it.
      { value: 'start', label: 'Left' },
      { value: 'center', label: 'Centre' }
    ]
  },
  size: {
    label: 'Size',
    type: 'choice',
    defaultValue: 'lg',
    options: [
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Medium' },
      { value: 'lg', label: 'Large' }
    ]
  },
  emphasis: {
    label: 'Surface',
    type: 'choice',
    // Unset draws no surface, which `propOf` reads `none` as.
    defaultValue: 'none',
    options: [
      { value: 'none', label: 'None' },
      { value: 'subtler', label: 'Subtler' },
      { value: 'subtle', label: 'Subtle' },
      { value: 'normal', label: 'Normal' },
      { value: 'raised', label: 'Raised' },
      { value: 'strong', label: 'Strong' },
      { value: 'inverted', label: 'Inverted' }
    ]
  },
  intent: {
    label: 'Colour',
    type: 'choice',
    defaultValue: 'neutral',
    options: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'brand', label: 'Brand' },
      { value: 'brand-secondary', label: 'Brand secondary' },
      { value: 'accent', label: 'Accent' }
    ]
  }
}

const PLACEHOLDERS: Readonly<Attrs> = {
  title: 'Section title',
  description: 'A sentence or two on what this section is about.'
}

// Each block maps over these, so a missing or saved non-list would throw.
const LISTS: ReadonlySet<string> = new Set([
  'actions',
  'cards',
  'figures',
  'images',
  'logos',
  'questions',
  'quotes',
  'rows',
  'stats',
  'tiles'
])

// An anchor id would repeat in a copied section, so it isn't offered.
const UNSAVED: ReadonlySet<string> = new Set(['id'])

const isAttrs = (value: unknown): value is Attrs =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasLinkAndLabel = ({ label, href }: Attrs) => Boolean(label && href)

const hasLabel = ({ label }: Attrs) => Boolean(label)

// Side by side's stats are a panel holding its figures, not a list.
function propOf(
  block: string,
  name: string,
  value: unknown,
  editing = false
): unknown {
  if (name === 'emphasis' && value === 'none') return undefined
  if (block === 'side-by-side' && name === 'stats') {
    const panel = isAttrs(value) ? value : {}
    return { ...panel, figures: propOf('', 'figures', panel.figures) }
  }
  if (!LISTS.has(name)) return value
  if (!Array.isArray(value)) return []
  // A new image or button draws nothing on the page until it's filled in,
  // but a button shows while it's edited, before it has a link.
  if (name === 'actions') {
    return value.filter(isAttrs).filter(editing ? hasLabel : hasLinkAndLabel)
  }
  if (name === 'images' || name === 'logos') {
    return value.filter(isAttrs).filter(({ src }) => Boolean(src))
  }
  return value
}

const propsOf = (block: string, attrs: Attrs, editing = false): Attrs =>
  Object.fromEntries(
    Object.entries(attrs).map(([name, value]) => [
      name,
      propOf(block, name, value, editing)
    ])
  )

// The prop that shows an item open, for blocks that fold their items away.
const OPENS: Readonly<Record<string, readonly [string, string]>> = {
  faq: ['questions', 'openQuestion']
}

function openedBy(block: string, editingItem: string | undefined): Attrs {
  const [list, prop] = OPENS[block] ?? []
  const [name, index] = editingItem?.split('.') ?? []
  return list && prop && name === list && index ? { [prop]: Number(index) } : {}
}

const blankText = (value: unknown) =>
  typeof value !== 'string' || value.trim() === ''

const hasNoImage = (value: unknown) => !isAttrs(value) || blankText(value.src)

/**
 * What a section shows while it's edited: a blank item's text as its item's
 * name, such as "Card", a blank button's label as "Button", and a missing
 * image as a placeholder, so nothing draws as an empty tile. The page never
 * sees these.
 */
function hinted(settings: readonly CatalogueSetting[], attrs: Attrs): Attrs {
  const shown: Attrs = { ...attrs }
  for (const setting of settings) {
    if (setting.available && !setting.available(attrs)) continue
    const value = attrs[setting.name]
    if (setting.type === 'image' && hasNoImage(value)) {
      shown[setting.name] = PLACEHOLDER_IMAGE
    }
    if (setting.type !== 'list' || !Array.isArray(value)) continue
    if (setting.item === 'action') {
      shown[setting.name] = value.map((item) =>
        isAttrs(item) && blankText(item.label)
          ? { ...item, label: setting.itemLabel }
          : item
      )
    }
    if (!setting.fields) continue
    const { fields, itemLabel } = setting
    const texts = fields.filter(({ type }) => type === 'text')
    shown[setting.name] = value.map((item) => {
      if (!isAttrs(item)) return item
      const filled: Attrs = { ...item }
      if (texts[0] && texts.every(({ name }) => blankText(item[name]))) {
        filled[texts[0].name] = itemLabel
      }
      for (const { name, type } of fields) {
        if (type === 'image' && hasNoImage(item[name])) {
          filled[name] = PLACEHOLDER_IMAGE
        }
      }
      return filled
    })
  }
  return shown
}

const camel = (kebab: string) =>
  kebab.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

// A block's items, by their prop, and what one is called.
const ITEMS: Readonly<Record<string, string>> = {
  cards: 'Card',
  questions: 'Question',
  stats: 'Stat',
  figures: 'Stat',
  rows: 'Row',
  tiles: 'Tile',
  quotes: 'Quote'
}

const LONG_TEXT = new Set(['description', 'answer', 'quote', 'body'])
const ITEM_TEXT = new Set([
  'title',
  'subtitle',
  'description',
  'question',
  'answer',
  'value',
  'label',
  'quote',
  'href'
])
const ITEM_IMAGES = new Set(['image', 'logo'])

const sentence = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

// An item's own fields, as settings: its text and its images.
function itemSettings(names: readonly string[]): CatalogueSetting[] {
  return names.flatMap((name): CatalogueSetting[] => {
    if (ITEM_IMAGES.has(name)) {
      return [{ name, label: sentence(name), type: 'image' }]
    }
    if (!ITEM_TEXT.has(name)) return []
    return [
      {
        name,
        label: name === 'href' ? 'Link' : sentence(name),
        type: 'text',
        multiline: LONG_TEXT.has(name)
      }
    ]
  })
}

type Part = CatalogueSetting extends infer Setting
  ? Setting extends unknown
    ? Omit<Setting, 'name' | 'available'>
    : never
  : never

// The fields a drawer edits as a whole: images, buttons, and the items.
// Presets differ in what an item holds and how many they take, so a list is
// one setting for each set of presets that agree, shown only for those.
function partsOf(block: CatalogueBlock, fields: Set<string>) {
  const parts: [string, Part, readonly string[]][] = []
  const reading = (name: string) =>
    block.presets.filter((preset) => preset.fields.includes(name))
  const maxOf = (preset: BlockPreset, name: string) =>
    (preset.limits as Record<string, { max?: number }> | undefined)?.[name]?.max
  const byAgreement = (name: string, part: (preset: BlockPreset) => Part) => {
    const groups = new Map<string, { part: Part; presets: string[] }>()
    for (const preset of reading(name)) {
      const made = part(preset)
      const key = JSON.stringify(made)
      const group = groups.get(key) ?? { part: made, presets: [] }
      group.presets.push(preset.name)
      groups.set(key, group)
    }
    for (const { part: made, presets } of groups.values()) {
      parts.push([name, made, presets])
    }
  }
  const limited = (max: number | undefined) =>
    max === undefined ? {} : { max }

  if (fields.has('actions')) {
    byAgreement('actions', (preset) => ({
      label: 'Buttons',
      type: 'list',
      itemLabel: 'Button',
      item: 'action',
      ...limited(maxOf(preset, 'actions'))
    }))
  }
  for (const name of ['image', 'logo', 'poster']) {
    if (fields.has(name)) {
      byAgreement(name, () => ({ label: sentence(name), type: 'image' }))
    }
  }
  for (const [name, itemLabel] of [
    ['images', 'Image'],
    ['logos', 'Logo']
  ] as const) {
    if (fields.has(name)) {
      byAgreement(name, () => ({
        label: sentence(name),
        type: 'list',
        itemLabel,
        item: 'image'
      }))
    }
  }
  for (const [name, itemLabel] of Object.entries(ITEMS)) {
    // Side by side's stats are a panel, not a list.
    if (
      !fields.has(name) ||
      (block.name === 'side-by-side' && name === 'stats')
    ) {
      continue
    }
    byAgreement(name, (preset) => ({
      label: sentence(name),
      type: 'list',
      itemLabel,
      fields: itemSettings(preset.itemFields ?? []),
      ...limited(maxOf(preset, name))
    }))
  }
  return parts
}

function settingsOf(block: CatalogueBlock): CatalogueSetting[] {
  const reads = (name: string) => (attrs: Readonly<Attrs>) =>
    block.presets
      .find((preset) => preset.name === attrs.preset)
      ?.fields.includes(name) ?? false
  const layout: CatalogueSetting[] =
    block.presets.length > 1
      ? [
          {
            name: 'preset',
            label: 'Layout',
            type: 'choice',
            options: block.presets.map(({ name, title }) => ({
              value: name,
              label: title
            }))
          }
        ]
      : []
  const fields = new Set(block.presets.flatMap((preset) => preset.fields))
  return [
    ...layout,
    ...Object.entries(FIELDS)
      .filter(([name]) => fields.has(name))
      .map(([name, field]) => ({ ...field, name, available: reads(name) })),
    ...partsOf(block, fields).map(
      ([name, part, presets]) =>
        ({
          ...part,
          name,
          available: (attrs: Readonly<Attrs>) =>
            presets.includes(String(attrs.preset))
        }) as CatalogueSetting
    )
  ]
}

/**
 * The catalogue's blocks as the editor's `sections`, for
 * `<Editor sections={…}>`: a section per block, a template per preset with
 * its thumbnail, and every part of it as settings: its plain fields, images,
 * buttons, and items.
 */
export function catalogueSections({
  components,
  thumbnailUrl,
  content
}: CatalogueSectionsOptions): CatalogueSection[] {
  return catalogue.flatMap((block): CatalogueSection[] => {
    const component = components[block.name as keyof CatalogueComponents]
    const [first] = block.presets
    if (!component || !first) return []
    const settings = settingsOf(block)
    // Every field is an attr, so what a template or setting sets is saved.
    const fields = Object.fromEntries(
      block.presets
        .flatMap((preset) => preset.fields)
        .filter((name) => !UNSAVED.has(name))
        .map((name) => [name, PLACEHOLDERS[name]])
    )
    return [
      {
        name: `${camel(block.name)}Section`,
        label: block.title,
        attrs: { ...fields, preset: first.name },
        settings,
        // Its attrs are its props by name, as saved, so lists are checked.
        render: ({ attrs, editing, editingItem }) => {
          if (!editing) {
            return createElement(
              component as ComponentType<Attrs>,
              propsOf(block.name, attrs)
            )
          }
          return createElement(
            EditingImages,
            null,
            createElement(component as ComponentType<Attrs>, {
              ...propsOf(block.name, hinted(settings, attrs), true),
              ...openedBy(block.name, editingItem)
            })
          )
        },
        templates: block.presets.map((preset) => ({
          label:
            block.presets.length > 1
              ? `${block.title}: ${preset.title}`
              : block.title,
          thumbnail: thumbnailUrl?.(preset.thumbnail),
          keywords: [block.title, preset.title, ...(block.keywords ?? [])],
          attrs: {
            ...preset.defaults,
            ...content?.(block, preset),
            preset: preset.name
          }
        }))
      }
    ]
  })
}
