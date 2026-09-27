'use client'

import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'

function joined(labels: ReactNode[]) {
  return labels.map((label, index) => (
    <Fragment key={index}>
      {index > 0 && ', '}
      {label}
    </Fragment>
  ))
}

// How many leading labels fit beside a "+N" for the rest. Widths are summed,
// not read from offsets, so right-to-left text counts the same way. The first
// label always shows, truncated if it has to be.
function fittingCount(ruler: HTMLElement, available: number) {
  const parts = Array.from(ruler.children) as HTMLElement[]
  // The ruler holds every label, then "+1" to "+(total - 1)".
  const total = (parts.length + 1) / 2
  let end = 0
  const ends = parts.slice(0, total).map((part) => (end += part.offsetWidth))
  if (total === 1 || ends[total - 1]! <= available) return total
  const more = (count: number) => parts[2 * total - 1 - count]!.offsetWidth
  let count = total - 1
  while (count > 1 && ends[count - 1]! + more(count) > available) count--
  return count
}

function countIn(box: HTMLElement | null, ruler: HTMLElement | null) {
  if (!box || !ruler || box.clientWidth === 0) return undefined
  return fittingCount(ruler, box.clientWidth)
}

export function SelectValueSummary({
  labels
}: {
  labels: (string | number)[]
}) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const rulerRef = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(labels.length)
  const total = labels.length
  const labelsKey = labels.join('\n')

  // Counts before paint whenever the labels change.
  useIsomorphicLayoutEffect(() => {
    const count = countIn(boxRef.current, rulerRef.current)
    if (count !== undefined) setShown(count)
  }, [labelsKey])

  // One observer for the component's life. Neither the box's width nor the
  // ruler's depends on what shows, so a recount can't resize what it watches.
  useEffect(() => {
    const box = boxRef.current
    const ruler = rulerRef.current
    if (!box || !ruler) return
    const observer = new ResizeObserver(() => {
      const count = countIn(box, ruler)
      if (count !== undefined) setShown(count)
    })
    observer.observe(box)
    // Labels change width without the box resizing, e.g. once a font loads.
    observer.observe(ruler)
    return () => observer.disconnect()
  }, [])

  const hidden = total - Math.min(shown, total)

  return (
    <span ref={boxRef} className='relative flex min-w-0'>
      <span className='sr-only'>{joined(labels)}</span>
      <span
        aria-hidden
        data-slot='select-value-shown'
        className='min-w-0 truncate'
      >
        {joined(labels.slice(0, total - hidden))}
      </span>
      {hidden > 0 && (
        <span aria-hidden data-slot='select-value-more' className='ps-1'>
          +{hidden}
        </span>
      )}
      <span
        ref={rulerRef}
        aria-hidden
        className='invisible absolute top-0 left-0 whitespace-nowrap'
      >
        {labels.map((label, index) => (
          <span key={index}>
            {index > 0 && ', '}
            {label}
          </span>
        ))}
        {labels.slice(1).map((_, index) => (
          <span key={index} className='ps-1'>
            +{index + 1}
          </span>
        ))}
      </span>
    </span>
  )
}
