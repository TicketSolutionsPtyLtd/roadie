import { type ReactNode, useId } from 'react'

import { Accordion } from '@oztix/roadie-components/accordion'
import { Prose } from '@oztix/roadie-components/prose'

import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { type FaqPreset, faqDefinition } from './definition'

export type { FaqPreset } from './definition'

export type FaqItem = {
  /** The question as people ask it. */
  question: string
  /** The answer as rich text, set in `Prose`. Open with the direct answer. */
  answer: ReactNode
}

export type FaqProps = {
  /**
   * `faq` lists the questions in an accordion, one open at a time.
   * @default 'faq'
   */
  preset?: FaqPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** The section's `id`, for linking to it. */
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
  items: FaqItem[]
}

/** Answers the questions people ask before they buy or sign up. */
export function Faq({
  preset: presetName,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  items
}: FaqProps) {
  const headingId = useId()
  const preset = presetOf(faqDefinition, presetName)

  return (
    <BlockRoot
      block={faqDefinition.name}
      variant={preset.variant}
      preset={preset.name}
      position={position}
      id={id}
      aria-labelledby={headingId}
      className='py-24 lg:py-32'
    >
      <div className='container-3xl grid gap-8'>
        <BlockHeading
          id={headingId}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
          align='start'
        />
        <Accordion emphasis='subtler' className='-mx-4 w-auto gap-1'>
          {items.map(({ question, answer }) => (
            <Accordion.Item key={question}>
              <Accordion.Trigger>
                <h3 className='text-display-ui-6 text-strong'>{question}</h3>
              </Accordion.Trigger>
              <Accordion.Content>
                <Prose>{answer}</Prose>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </BlockRoot>
  )
}
