import type { ReactNode } from 'react'

import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react/ssr'

import { CodePreview } from './CodePreview'

const EXAMPLE_WIDTHS = {
  40: 'w-40',
  56: 'w-56',
  64: 'w-64',
  72: 'w-72'
} as const

type GuidelineCardProps = {
  example?: ReactNode
  /** A spacing-scale width for an example that would otherwise shrink to its content. It never overflows the card. */
  width?: keyof typeof EXAMPLE_WIDTHS
  code?: string
  children: ReactNode
}

function GuidelineCard({
  type,
  example,
  width,
  code,
  children
}: GuidelineCardProps & { type: 'do' | 'dont' }) {
  const isDo = type === 'do'
  const Icon = isDo ? CheckCircleIcon : XCircleIcon
  const hasVisual = example || code

  return (
    <div className='grid overflow-hidden'>
      {hasVisual && (
        <div
          data-not-prose
          className='grid rounded-t-xl border-x border-t border-subtler'
        >
          {example && (
            <div
              data-slot='guideline-example'
              className='grid min-h-40 min-w-0 grid-cols-1 content-center justify-items-center p-4'
            >
              {width ? (
                <div className={`grid max-w-full ${EXAMPLE_WIDTHS[width]}`}>
                  {example}
                </div>
              ) : (
                example
              )}
            </div>
          )}
          {code && (
            <CodePreview
              showCopy={isDo}
              className={`${example ? 'border-t border-subtler' : 'rounded-t-xl'} relative min-w-0 emphasis-sunken`}
            >
              {code}
            </CodePreview>
          )}
        </div>
      )}
      <div
        className={`${isDo ? 'intent-success' : 'intent-danger'} grid min-h-32 content-start gap-2 rounded-b-xl border-t-3 border-strong bg-subtle p-4`}
      >
        <p
          data-not-prose
          className='flex items-center gap-2 text-display-ui-6 text-strong'
        >
          <Icon weight='fill' className='size-5 text-subtle' />
          {isDo ? 'Do' : 'Don’t'}
        </p>
        <div className='text-sm [&_p]:mb-0 [&_p]:text-sm [&_p]:leading-normal'>
          {children}
        </div>
      </div>
    </div>
  )
}

function Do(props: GuidelineCardProps) {
  return <GuidelineCard type='do' {...props} />
}

function Dont(props: GuidelineCardProps) {
  return <GuidelineCard type='dont' {...props} />
}

/** Sets an example's parts side by side, with any caption at the guidance's size. */
function Row({ children }: { children: ReactNode }) {
  return (
    <div className='flex flex-wrap items-center justify-center gap-2 text-sm'>
      {children}
    </div>
  )
}

/** Spaces the guidelines under a page's `## Guidelines` heading. */
export function Guidelines({ children }: { children: ReactNode }) {
  return (
    <div data-slot='guidelines' className='grid gap-8'>
      {children}
    </div>
  )
}

export function Guideline({
  title,
  description,
  headingLevel = 4,
  children
}: {
  title: string
  description?: ReactNode
  headingLevel?: 3 | 4
  children: ReactNode
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  // Only the chrome escapes `.prose`; the MDX guidance inside the cards stays
  // in it, so its inline code and links match the rest of the page.
  return (
    <div data-slot='guideline' className='grid gap-2'>
      <div data-not-prose className='grid gap-2'>
        <Heading className='text-display-ui-5 text-strong'>{title}</Heading>
        {description && <p className='text-sm text-subtle'>{description}</p>}
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>{children}</div>
    </div>
  )
}

Guideline.Do = Do
Guideline.Dont = Dont
Guideline.Row = Row
