'use client'

import { memo } from 'react'

import type { Intent } from '@roadie-core/tokens'

import type { TokenEntry } from '@/lib/tokens'

import { Badge } from '@oztix/roadie-components/badge'
import { Code } from '@oztix/roadie-components/code'
import { Highlight } from '@oztix/roadie-components/highlight'

import { CopyChip } from './CopyChip'
import { TokenPreview } from './TokenPreview'

/** Families whose samples render at their real size, wider than the default column. */
const WIDE_PREVIEWS = new Set(['component-utilities'])

function copyTarget({ name, kind }: TokenEntry) {
  if (kind === 'variable') return `var(${name})`
  if (kind === 'variant') return `${name}:`
  return name
}

function label({ name, kind }: TokenEntry) {
  if (kind === 'variant') return `${name}:`
  if (kind === 'keyframes') return `@keyframes ${name}`
  return name
}

function Values({ token, intent }: { token: TokenEntry; intent: Intent }) {
  const value =
    (intent !== 'neutral' && token.byIntent?.[intent]) || token.value
  if (!value?.light) return null
  const resolved = value === token.value ? token.resolved : undefined
  const rows = [
    { mode: 'Light', raw: value.light, final: resolved?.light },
    ...(value.dark || resolved?.dark
      ? [
          {
            mode: 'Dark',
            raw: value.dark ?? value.light,
            final: resolved?.dark
          }
        ]
      : [])
  ]
  const labelled = rows.length > 1

  return (
    <dl className='grid gap-0.5 font-mono text-xs text-subtle'>
      {rows.map(({ mode, raw, final }) => (
        <div key={mode} className='flex min-w-0 gap-2'>
          {labelled ? (
            <dt className='w-8 shrink-0 text-subtler'>{mode}</dt>
          ) : null}
          <dd className='line-clamp-2 min-w-0 break-all' title={raw}>
            {raw}
            {final ? <span className='text-subtler'> → {final}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A CSS comment's `code` spans as inline code, the rest as text. */
function Description({ text }: { text: string }) {
  return (
    <p className='text-sm text-subtle'>
      {text
        .split(/(`[^`]+`)/)
        .map((part, index) =>
          part.startsWith('`') && part.endsWith('`') ? (
            <Code key={index}>{part.slice(1, -1)}</Code>
          ) : (
            part
          )
        )}
    </p>
  )
}

/** One token: a live preview, copyable names, its value in each mode and what it's for. */
export const TokenRow = memo(function TokenRow({
  token,
  query,
  intent,
  caption
}: {
  token: TokenEntry
  query: string
  intent: Intent
  caption?: string
}) {
  const classes = token.kind === 'variable' ? token.classes : undefined

  return (
    <li
      className={`grid items-start gap-x-3 gap-y-1.5 py-3 ${
        WIDE_PREVIEWS.has(token.family)
          ? 'grid-cols-[5rem_minmax(0,1fr)]'
          : 'grid-cols-[3rem_minmax(0,1fr)]'
      }`}
    >
      <div
        className={`row-span-4 grid min-h-12 items-center ${
          WIDE_PREVIEWS.has(token.family)
            ? 'justify-items-start'
            : 'justify-items-center'
        }`}
      >
        <TokenPreview token={token} />
      </div>
      <div className='flex min-w-0 flex-wrap items-center gap-1'>
        <CopyChip value={copyTarget(token)} className='text-strong'>
          <Highlight text={label(token)} query={query} />
        </CopyChip>
        {classes?.slice(0, 2).map((utility) => (
          <CopyChip key={utility} value={utility} className='text-subtle'>
            <Highlight text={utility} query={query} />
          </CopyChip>
        ))}
        {classes && classes.length > 2 ? (
          <span
            className='text-xs text-subtler'
            title={classes.slice(2).join(' ')}
          >
            +{classes.length - 2} more
          </span>
        ) : null}
        {token.source === 'tailwind' ? (
          <Badge size='sm' emphasis='subtle'>
            Tailwind
          </Badge>
        ) : null}
      </div>
      <Values token={token} intent={intent} />
      {token.description ? <Description text={token.description} /> : null}
      {caption ? <p className='text-xs text-subtler'>{caption}</p> : null}
    </li>
  )
})
