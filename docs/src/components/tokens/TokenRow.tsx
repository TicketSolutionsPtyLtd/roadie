'use client'

import { memo } from 'react'

import type { Intent } from '@roadie-core/tokens'
import Color from 'colorjs.io'

import type { TokenEntry } from '@/lib/tokens'

import { Badge } from '@oztix/roadie-components/badge'
import { Code } from '@oztix/roadie-components/code'
import { Highlight } from '@oztix/roadie-components/highlight'
import { type Mode, chartHex } from '@oztix/roadie-core/dataviz'

import { CopyChip } from './CopyChip'
import { TokenPreview } from './TokenPreview'

const DIVERGE_STEPS: Record<string, number> = {
  'pos-4': 0,
  'pos-3': 1,
  'pos-2': 2,
  'pos-1': 3,
  '0': 4,
  'neg-1': 5,
  'neg-2': 6,
  'neg-3': 7,
  'neg-4': 8
}

/** Maps a dataviz token name to its hex value. Undefined for a token with no colour, such as a set alias or an ink length. */
function datavizHex(name: string, mode: Mode): string | undefined {
  const hex = chartHex(mode)
  const base = name.replace(/^--/, '').replace(/^color-/, '')
  const categorical = base.match(/^chart-(\d+)$/)
  if (categorical) return hex.categorical[Number(categorical[1]) - 1]
  const heat = base.match(/^chart-heat-(\d+)$/)
  if (heat) return hex.heat[Number(heat[1])]
  const divergeStep = base.match(/^chart-diverge-(.+)$/)?.[1]
  const divergeIndex =
    divergeStep === undefined ? undefined : DIVERGE_STEPS[divergeStep]
  if (divergeIndex !== undefined) return hex.diverging[divergeIndex]
  const status = base.match(/^chart-status-(good|warning|serious|critical)$/)
  if (status) return hex.status[status[1] as keyof typeof hex.status]
  if (base === 'chart-highlight') return hex.highlight
  const grey = base.match(/^chart-(context|median|other|missing)$/)
  if (grey) return hex.greys[grey[1] as keyof typeof hex.greys]
  if (base === 'chart-band') return hex.band.color
  return undefined
}

function contrastRatio(hex: string, against: string) {
  const ratio = new Color(hex).contrast(new Color(against), 'WCAG21')
  return `${Math.abs(ratio).toFixed(1)}:1`
}

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
  const light = token.family === 'dataviz' && datavizHex(token.name, 'light')
  const dark = token.family === 'dataviz' && datavizHex(token.name, 'dark')

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
      {light && dark ? (
        <div className='flex min-w-0 flex-wrap gap-x-2'>
          <dt className='shrink-0 text-subtler'>Contrast</dt>
          <dd className='min-w-0 break-all'>
            {contrastRatio(light, '#ffffff')} light,{' '}
            {contrastRatio(dark, chartHex('dark').chrome.surface)} dark
          </dd>
        </div>
      ) : null}
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
