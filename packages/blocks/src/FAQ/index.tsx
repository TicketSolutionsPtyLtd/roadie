import type { ReactNode } from 'react'

import { Accordion } from '@oztix/roadie-components/accordion'
import { Prose } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import { filledIntent, itemIntent } from '../_shared/items'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  type ItemEmphasis,
  gapOf
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type FAQPreset, faqDefinition } from './definition'

export type { FAQPreset } from './definition'

/** The questions' surface, from the item emphases Accordion draws. */
export type FAQItemEmphasis = Exclude<ItemEmphasis, 'raised'>

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
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The questions, in the order people ask them. */
  questions: readonly FAQItem[]
  /** The question that starts open, counting from 0, such as the one an editor is editing. */
  openQuestion?: number
  /** Links under the questions, such as to every FAQ. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The block's intent, for the highlighted words, the questions' tint and the strong action. */
  intent?: BlockIntent
  /** The surface behind the block: a band across the window, or a panel with `contained`. None by default. */
  emphasis?: BlockEmphasis
  /** Draws the `emphasis` as a rounded panel within the page's frame, in line with the hero, instead of a band across the window. */
  contained?: boolean
  /**
   * The questions' surface: `subtler` lines them up on the page, `subtle` tints each one, and `normal` boxes them. Roadie's Accordion has no raised questions.
   * @default 'subtler'
   */
  itemEmphasis?: FAQItemEmphasis
  /**
   * The heading's and actions' alignment. The questions always start.
   * @default 'start'
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with tighter gaps.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Answers the questions people ask before they buy or sign up. */
export function FAQ(props: FAQProps) {
  const {
    questions,
    openQuestion,
    itemEmphasis = faqDefinition.presets[0].defaults.itemEmphasis,
    size
  } = props
  const block = useBlock(faqDefinition, props)

  return (
    <BlockRoot {...block.root}>
      <BlockSurface
        emphasis={block.emphasis}
        contained={block.contained}
        width='3xl'
        className={cn('grid grid-cols-1', gapOf(size, 'normal'))}
      >
        <BlockHeading {...block.heading} />
        {/* Unboxed questions hang their inset, so the text lines up with the heading. */}
        <Accordion
          emphasis={itemEmphasis}
          intent={itemIntent(
            {},
            itemEmphasis,
            filledIntent(props.intent, block.emphasis)
          )}
          className={cn(
            itemEmphasis === 'subtler' && '-mx-(--content-inset) w-auto'
          )}
        >
          {questions.map(({ question, answer }, index) => (
            <Accordion.Item
              key={`${index}-${question}`}
              open={index === openQuestion || undefined}
            >
              <Accordion.Trigger>
                <h3>{question}</h3>
              </Accordion.Trigger>
              <Accordion.Content>
                <Prose>{answer}</Prose>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
        <BlockActions {...block.actions} />
      </BlockSurface>
    </BlockRoot>
  )
}
