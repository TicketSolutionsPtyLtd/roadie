import type { ReactNode } from 'react'

import { CheckCircle, XCircle } from '@phosphor-icons/react/ssr'

function GuidelineCard({
  type,
  example,
  children
}: {
  type: 'do' | 'dont'
  example?: ReactNode
  children: ReactNode
}) {
  const isDo = type === 'do'
  const Icon = isDo ? CheckCircle : XCircle

  return (
    <div
      className={`grid ${example ? 'grid-rows-[1fr_auto]' : ''} overflow-hidden rounded-xl`}
    >
      {example && (
        <div
          className='overflow-x-auto rounded-t-xl border-x border-t border-subtler emphasis-sunken p-4'
          style={{ scrollbarWidth: 'none' }}
        >
          {example}
        </div>
      )}
      <div
        className={`${isDo ? 'intent-success' : 'intent-danger'} inline-grid content-start gap-2 border-t-3 border-strong bg-subtle p-4`}
      >
        <p className='flex items-center gap-2 text-display-ui-6 text-strong'>
          <Icon weight='fill' className='size-5 text-subtle' />
          {isDo ? 'Do' : 'Don\u2019t'}
        </p>
        <p className='text-sm'>{children}</p>
      </div>
    </div>
  )
}

export function Guideline({
  title,
  description,
  doContent,
  dontContent,
  doExample,
  dontExample
}: {
  title: string
  description?: ReactNode
  doContent: ReactNode
  dontContent: ReactNode
  doExample?: ReactNode
  dontExample?: ReactNode
}) {
  return (
    <div className='grid gap-2'>
      <h4 className='text-display-ui-5 text-strong'>{title}</h4>
      {description && <p className='text-sm text-subtle'>{description}</p>}
      <div className='grid gap-4 sm:grid-cols-2'>
        <GuidelineCard type='do' example={doExample}>
          {doContent}
        </GuidelineCard>
        <GuidelineCard type='dont' example={dontExample}>
          {dontContent}
        </GuidelineCard>
      </div>
    </div>
  )
}
