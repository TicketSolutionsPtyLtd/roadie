import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import Link from 'next/link'

import { CodePreview } from '@/components/CodePreview'
import { exampleHref } from '@/lib/live-examples.mjs'

type AnchorProps = ComponentPropsWithoutRef<'a'>
/** Set on live fences by `src/lib/live-examples.mjs`. */
type FenceProps = ComponentPropsWithoutRef<'code'> & {
  'data-example-id'?: string
  'data-example-page'?: string
  'data-example-eager'?: string
}

const components = {
  // Not the Prose component: On this page skips headings under a data-slot.
  // The docs column already caps the width, and wide pages need full-width examples.
  wrapper: ({ children }: { children: ReactNode }) => (
    <div className='prose min-w-0 [--prose-measure:none] [--prose-size:var(--text-lg)]'>
      {children}
    </div>
  ),
  a: ({ href, ...props }: AnchorProps) => {
    if (href?.startsWith('/')) return <Link href={href} {...props} />
    if (href?.startsWith('#')) return <a href={href} {...props} />
    return (
      <a href={href} target='_blank' rel='noopener noreferrer' {...props} />
    )
  },
  // CodePreview draws its own pre, so a fence opens as a plain block.
  pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => <div>{children}</div>,
  code: ({
    children,
    className,
    'data-example-id': id,
    'data-example-page': page,
    'data-example-eager': eager
  }: FenceProps) => {
    if (className === undefined) return <code>{children}</code>

    return (
      <CodePreview
        language={className.replace('language-', '')}
        exampleHref={id && page ? exampleHref(page, id) : undefined}
        eager={eager !== undefined}
      >
        {children?.toString() ?? ''}
      </CodePreview>
    )
  },
  table: (props: ComponentPropsWithoutRef<'table'>) => (
    <div className='prose-scroll'>
      <table {...props} />
    </div>
  )
}

declare global {
  type MDXProvidedComponents = typeof components
}

export function useMDXComponents(): MDXProvidedComponents {
  return components
}
