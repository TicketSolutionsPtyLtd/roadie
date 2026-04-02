import type { ReactNode } from 'react'

import { CheckCircle, XCircle } from '@phosphor-icons/react/ssr'

import { CodePreview } from './CodePreview'

function GuidelineCard({
  type,
  example,
  code,
  children
}: {
  type: 'do' | 'dont'
  example?: ReactNode
  code?: string
  children: ReactNode
}) {
  const isDo = type === 'do'
  const Icon = isDo ? CheckCircle : XCircle
  const hasVisual = example || code

  return (
    <div className='grid overflow-hidden'>
      {hasVisual && (
        <div className='grid rounded-t-xl border-x border-t border-subtler'>
          {example && (
            <div className='grid min-h-40 place-content-center p-4'>
              {example}
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
        <p className='flex items-center gap-2 text-display-ui-6 text-strong'>
          <Icon weight='fill' className='size-5 text-subtle' />
          {isDo ? 'Do' : 'Don\u2019t'}
        </p>
        <p className='text-sm'>{children}</p>
      </div>
    </div>
  )
}

function Do({
  example,
  code,
  children
}: {
  example?: ReactNode
  code?: string
  children: ReactNode
}) {
  return (
    <GuidelineCard type='do' example={example} code={code}>
      {children}
    </GuidelineCard>
  )
}

function Dont({
  example,
  code,
  children
}: {
  example?: ReactNode
  code?: string
  children: ReactNode
}) {
  return (
    <GuidelineCard type='dont' example={example} code={code}>
      {children}
    </GuidelineCard>
  )
}

export function Guideline({
  title,
  description,
  children
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <div className='grid gap-2'>
      <h4 className='text-display-ui-5 text-strong'>{title}</h4>
      {description && <p className='text-sm text-subtle'>{description}</p>}
      <div className='grid gap-4 sm:grid-cols-2'>{children}</div>
    </div>
  )
}

Guideline.Do = Do
Guideline.Dont = Dont
