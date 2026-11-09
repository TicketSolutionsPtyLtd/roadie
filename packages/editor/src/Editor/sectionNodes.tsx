'use client'

import { Component, type ReactNode, use } from 'react'

import { SquaresFourIcon } from '@phosphor-icons/react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper } from '@tiptap/react'

import { Badge } from '@oztix/roadie-components/badge'
import { EmptyState } from '@oztix/roadie-components/empty-state'

import {
  type EditorBlock,
  type EditorNodeViewProps,
  type EditorSection,
  reactNodeView
} from '../extensions'
import { EditorContext } from './EditorContext'
import { insertBlock } from './emailEditing'
import type { EditorInsertItem } from './insertItems'

type Attrs = Record<string, unknown>
type Render = EditorSection['render']

export const SECTIONS_GROUP = 'Sections'

type BoundaryProps = { attrs: Attrs; children: ReactNode }

// Saved attrs are untrusted, so one that throws loses its section, not the page.
class SectionBoundary extends Component<
  BoundaryProps,
  { failed: boolean; attrs: Attrs }
> {
  constructor(props: BoundaryProps) {
    super(props)
    this.state = { failed: false, attrs: props.attrs }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  // Another try with each edit, as a setting may be what broke it.
  static getDerivedStateFromProps(
    { attrs }: BoundaryProps,
    state: { failed: boolean; attrs: Attrs }
  ) {
    return attrs === state.attrs ? null : { failed: false, attrs }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <EmptyState size='sm' intent='danger' className='rounded-lg bg-subtle'>
        <EmptyState.Title render={<p />}>
          This section can’t be shown.
        </EmptyState.Title>
      </EmptyState>
    )
  }
}

type DrawnProps = { render: Render; attrs: Attrs; editingItem?: string }

function Drawn({ render, attrs, editingItem }: DrawnProps) {
  return render({ attrs, editing: true, editingItem })
}

const own = (attrs: Attrs, keys: readonly string[]) =>
  Object.fromEntries(keys.map((key) => [key, attrs[key]]))

function pastedAttrs(element: HTMLElement): Attrs {
  try {
    const attrs: unknown = JSON.parse(element.getAttribute('data-attrs') ?? '')
    return typeof attrs === 'object' && attrs !== null && !Array.isArray(attrs)
      ? (attrs as Attrs)
      : {}
  } catch {
    return {}
  }
}

/**
 * A section as an app's block: an atom whose attrs are its fields, drawn as
 * the page draws it. What it draws can't be clicked or focused, so a click
 * selects it and its links stay put.
 */
export function sectionBlock(section: EditorSection): EditorBlock {
  const keys = Object.keys(section.attrs)

  function SectionView({ node, selected }: EditorNodeViewProps) {
    const attrs = own(node.attrs, keys)
    const editingItem = use(EditorContext)?.editingItem ?? undefined
    return (
      <NodeViewWrapper
        data-slot='editor-section'
        // What it draws is inert, so this names it for a screen reader.
        role='group'
        aria-label={section.label}
        data-selected={selected ? '' : undefined}
        className='not-prose relative rounded-md'
      >
        {/* Its name, on its ring above it, clear of what it draws, while
            it's under the pointer. Opaque, so the block above can't show
            through. */}
        <Badge
          data-slot='editor-section-name'
          size='sm'
          className='absolute start-0 -top-0.5 z-1 -translate-y-full emphasis-raised'
          aria-hidden
        >
          {section.label}
        </Badge>
        {/* Its fallback replaces the inert box, so a screen reader reads it. */}
        <SectionBoundary attrs={node.attrs}>
          <div inert>
            <Drawn
              render={section.render}
              attrs={attrs}
              editingItem={selected ? editingItem : undefined}
            />
          </div>
        </SectionBoundary>
      </NodeViewWrapper>
    )
  }

  return {
    label: section.label,
    icon: SquaresFourIcon,
    group: SECTIONS_GROUP,
    settings: section.settings,
    node: Node.create({
      name: section.name,
      group: 'block',
      atom: true,
      addAttributes: () =>
        Object.fromEntries(
          keys.map((key) => [
            key,
            {
              default: section.attrs[key],
              parseHTML: (element: HTMLElement) => {
                const pasted = pastedAttrs(element)
                return Object.hasOwn(pasted, key)
                  ? pasted[key]
                  : section.attrs[key]
              },
              // All of them go in one attribute, as JSON, in renderHTML.
              renderHTML: () => ({})
            }
          ])
        ),
      parseHTML: () => [{ tag: `div[data-section="${section.name}"]` }],
      renderHTML: ({ node, HTMLAttributes }) => [
        'div',
        mergeAttributes(HTMLAttributes, {
          'data-section': section.name,
          'data-attrs': JSON.stringify(own(node.attrs, keys))
        })
      ],
      addNodeView: () => {
        const view = reactNodeView(SectionView)
        // The outer box is the text's child, so it can leave the text's measure.
        return (props) => {
          const rendered = view(props)
          if (rendered.dom instanceof HTMLElement) {
            rendered.dom.classList.add('prose-bleed')
          }
          return rendered
        }
      }
    })
  }
}

/** A section's templates, as insert menu items that each add it as they start it. */
export function sectionInsertItems(section: EditorSection): EditorInsertItem[] {
  const templates = section.templates?.length
    ? section.templates
    : [{ label: section.label }]
  return templates.map((template) => {
    const content = {
      type: section.name,
      attrs: { ...section.attrs, ...template.attrs }
    }
    return {
      label: template.label,
      icon: SquaresFourIcon,
      group: SECTIONS_GROUP,
      keywords: ['section', section.label, ...(template.keywords ?? [])],
      thumbnail: template.thumbnail,
      block: content,
      insert: (chain) => chain.command(insertBlock(content)),
      enabled: (_editor, afterQuery) =>
        afterQuery().command(insertBlock(content)).run()
    }
  })
}
