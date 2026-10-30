import { type ReactNode, useId } from 'react'

import { Accordion } from '@oztix/roadie-components/accordion'
import { Prose } from '@oztix/roadie-components/prose'

import type { BlockAction } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import type { BlockEmphasis, BlockIntent } from '../_shared/surface'
import { type FAQPreset, faqDefinition } from './definition'

export type { FAQPreset } from './definition'

/** The question surfaces an FAQ takes, in Roadie Accordion's own names. */
export type FAQEmphasis = Extract<
  BlockEmphasis,
  'subtler' | 'subtle' | 'normal'
>

export type FAQItem = {
  /** The question as people ask it. */
  question: string
  /** The answer as rich text, set in `Prose`. Open with the direct answer. */
  answer: ReactNode
}

export type FAQProps = {
  /**
   * `accordion` lists the questions in an accordion, one open at a time.
   * @default 'accordion'
   */
  preset?: FAQPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section heading. */
  title: string
  /** Words in the title to mark. */
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The questions, in the order people ask them. */
  items: readonly FAQItem[]
  /** Links under the questions, such as to every FAQ. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The block's intent, for the highlighted words, the questions' tint and the strong action. */
  intent?: BlockIntent
  /**
   * The questions' surface: `subtler` lines them up on the page, `subtle` tints each one, and `normal` boxes them.
   * @default 'subtler'
   */
  emphasis?: FAQEmphasis
}

/** Answers the questions people ask before they buy or sign up. */
export function FAQ({
  preset: presetName,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  items,
  actions,
  intent,
  emphasis = 'subtler'
}: FAQProps) {
  const headingId = useId()
  const { name, variant } = presetOf(faqDefinition, presetName)

  return (
    <BlockRoot
      block={faqDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
      intent={intent}
    >
      <div className='container-3xl grid grid-cols-1 gap-8'>
        <BlockHeading
          id={headingId}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
          align='start'
          intent={intent}
        />
        <Accordion emphasis={emphasis} className='-mx-4 w-auto gap-1'>
          {items.map(({ question, answer }, index) => (
            <Accordion.Item key={`${index}-${question}`}>
              <Accordion.Trigger>
                <h3 className='text-display-ui-6 text-strong'>{question}</h3>
              </Accordion.Trigger>
              <Accordion.Content>
                <Prose>{answer}</Prose>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
        <BlockActions actions={actions} />
      </div>
    </BlockRoot>
  )
}
