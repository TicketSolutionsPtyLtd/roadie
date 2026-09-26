'use client'

import { Fragment, type ReactNode, useRef, useState } from 'react'

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
function fittingCount(ruler: HTMLElement, available: number, total: number) {
  const parts = Array.from(ruler.children) as HTMLElement[]
  let end = 0
  const ends = parts.slice(0, total).map((part) => (end += part.offsetWidth))
  if (total === 1 || ends[total - 1]! <= available) return total
  // The ruler holds "+1" to "+(total - 1)" after the labels.
  const more = (count: number) => parts[2 * total - 1 - count]!.offsetWidth
  let count = total - 1
  while (count > 1 && ends[count - 1]! + more(count) > available) count--
  return count
}

export function SelectValueSummary({ labels }: { labels: ReactNode[] }) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const rulerRef = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(labels.length)
  const total = labels.length

  useIsomorphicLayoutEffect(() => {
    const box = boxRef.current
    const ruler = rulerRef.current
    if (!box || !ruler) return
    const fit = () => {
      if (box.clientWidth > 0)
        setShown(fittingCount(ruler, box.clientWidth, total))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    // Labels change width without the box resizing, e.g. once a font loads.
    observer.observe(ruler)
    return () => observer.disconnect()
  })

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
