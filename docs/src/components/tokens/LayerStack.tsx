'use client'

import { type ReactNode, useState } from 'react'

import Link from 'next/link'

import { ArrowDownIcon, ArrowRightIcon } from '@phosphor-icons/react'
import type { Intent } from '@roadie-core/tokens'

import { Code } from '@oztix/roadie-components/code'
import { Select } from '@oztix/roadie-components/select'

const INTENTS: Intent[] = [
  'neutral',
  'brand',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]

const STEPS = Array.from({ length: 14 }, (_, step) => step)

const sentence = (text: string) => text[0]!.toUpperCase() + text.slice(1)

function Layer({
  step,
  title,
  body,
  code,
  href,
  linkLabel,
  intent,
  children
}: {
  step: number
  title: string
  body: string
  code: string
  href: string
  linkLabel: string
  intent: Intent
  children: ReactNode
}) {
  return (
    <li className='grid emphasis-raised gap-4 rounded-xl p-4'>
      <div className='grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3'>
        <span className='grid size-7 emphasis-strong place-items-center rounded-full text-sm font-bold'>
          {step}
        </span>
        <div className='grid gap-1'>
          <h3 className='text-display-ui-5 text-strong'>{title}</h3>
          <p className='text-sm text-subtle'>{body}</p>
        </div>
      </div>
      <div className={`grid gap-3 rounded-lg bg-sunken p-3 intent-${intent}`}>
        {children}
      </div>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Code>{code}</Code>
        <Link
          href={href}
          className='inline-flex items-center gap-1 text-sm font-medium text-strong underline-offset-4 hover:underline'
        >
          {linkLabel}
          <ArrowRightIcon weight='bold' className='size-3' />
        </Link>
      </div>
    </li>
  )
}

function Between() {
  return (
    <li aria-hidden className='grid justify-center text-subtler'>
      <ArrowDownIcon weight='bold' className='size-4' />
    </li>
  )
}

/** The five layers of Roadie colour, each drawn live under one intent picker. */
export function LayerStack() {
  const [intent, setIntent] = useState<Intent>('danger')

  return (
    <section aria-labelledby='how-it-stacks' className='grid gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 id='how-it-stacks' className='text-display-ui-3 text-strong'>
          How it stacks
        </h2>
        <Select
          value={intent}
          onValueChange={(value) => setIntent(value as Intent)}
        >
          <Select.Trigger aria-label='Preview in intent' className='w-auto'>
            <Select.Value>
              {(value: string) => `Preview in ${sentence(value)}`}
            </Select.Value>
            <Select.Icon />
          </Select.Trigger>
          <Select.Content>
            {INTENTS.map((option) => (
              <Select.Item key={option} value={option}>
                {sentence(option)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
      <p className='text-subtle'>
        Each layer reads the one above it. Change the intent and every layer
        follows, because intent only sets variables and the rest inherit them.
      </p>
      <ol className='grid gap-2'>
        <Layer
          intent={intent}
          step={1}
          title='Scale'
          body='Fourteen OKLCH steps per palette, from the lightest surface to the strongest text. Dark mode swaps the values, never the step numbers.'
          code={`--color-${intent}-0 … 13`}
          href='/tokens/color-scales'
          linkLabel='Color scales'
        >
          <div className='grid grid-cols-14 overflow-hidden rounded-md'>
            {STEPS.map((step) => (
              <span
                key={step}
                className='h-8'
                style={{ backgroundColor: `var(--intent-${step})` }}
              />
            ))}
          </div>
        </Layer>
        <Between />
        <Layer
          intent={intent}
          step={2}
          title='Intent'
          body='Picks the scale. It sets variables and nothing else, and children inherit them.'
          code={`intent-${intent}`}
          href='/tokens/intents'
          linkLabel='Intents'
        >
          <div className='flex flex-wrap gap-2 font-mono text-xs text-subtle'>
            {[
              '--intent-bg-strong',
              '--intent-text-normal',
              '--intent-border-normal'
            ].map((name) => (
              <span key={name} className='inline-flex items-center gap-1.5'>
                <span
                  className='size-4 rounded-sm border border-subtler'
                  style={{ backgroundColor: `var(${name})` }}
                />
                {name}
              </span>
            ))}
          </div>
        </Layer>
        <Between />
        <Layer
          intent={intent}
          step={3}
          title='Semantic utilities'
          body='One property each, named by role rather than step: bg-*, text-* and border-*.'
          code='bg-subtle text-normal border-subtle'
          href='/tokens/intents'
          linkLabel='Intents'
        >
          <div className='grid gap-1 rounded-lg border border-subtle bg-subtle p-3'>
            <p className='text-sm font-semibold text-strong'>Payment failed</p>
            <p className='text-sm text-normal'>
              Check your card and try again.
            </p>
          </div>
        </Layer>
        <Between />
        <Layer
          intent={intent}
          step={4}
          title='Emphasis presets'
          body='Background, text, border and shadow in one class, for anything that needs to stand out by a set amount.'
          code='emphasis-strong'
          href='/tokens/emphasis'
          linkLabel='Emphasis and states'
        >
          <div className='flex flex-wrap gap-2'>
            {['strong', 'normal', 'subtle', 'subtler'].map((level) => (
              <span
                key={level}
                className={`rounded-full px-3 py-1 text-sm font-semibold emphasis-${level}`}
              >
                {sentence(level)}
              </span>
            ))}
          </div>
        </Layer>
        <Between />
        <Layer
          intent={intent}
          step={5}
          title='Interaction states'
          body='Hover, press, focus ring and disabled, coloured by the same intent.'
          code='is-interactive'
          href='/tokens/emphasis'
          linkLabel='Emphasis and states'
        >
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              className='is-interactive emphasis-strong rounded-full px-3 py-1 text-sm font-semibold'
            >
              Hover or focus me
            </button>
            <button
              type='button'
              disabled
              className='is-interactive emphasis-normal rounded-full px-3 py-1 text-sm font-semibold'
            >
              Disabled
            </button>
          </div>
        </Layer>
      </ol>
    </section>
  )
}
