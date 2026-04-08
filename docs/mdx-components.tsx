import type { ComponentPropsWithoutRef } from 'react'

import { Link } from 'next-view-transitions'

import { CodePreview } from '@/components/CodePreview'

import { Code, type CodeProps } from '@oztix/roadie-components'

type AnchorProps = ComponentPropsWithoutRef<'a'>
type BlockquoteProps = ComponentPropsWithoutRef<'blockquote'>

const components = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1
      className='mb-3 pt-8 text-display-prose-1 text-strong first:pt-0'
      {...props}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className='mt-12 mb-4 text-display-prose-2 text-strong' {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className='mt-12 mb-4 text-display-prose-3 text-strong' {...props} />
  ),
  h4: (props: ComponentPropsWithoutRef<'h4'>) => (
    <h4 className='mt-8 mb-4 text-display-prose-4 text-strong' {...props} />
  ),
  h5: (props: ComponentPropsWithoutRef<'h5'>) => (
    <h5 className='mt-8 mb-4 text-display-prose-5 text-strong' {...props} />
  ),
  h6: (props: ComponentPropsWithoutRef<'h6'>) => (
    <h6 className='mt-8 mb-4 text-display-prose-6 text-strong' {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className='mb-4 text-lg text-subtle' {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className='mb-8 grid list-decimal gap-2 pl-8' {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className='mb-8 grid list-disc gap-2 pl-8' {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => (
    <li className='pl-1 text-lg text-subtle' {...props} />
  ),
  em: (props: ComponentPropsWithoutRef<'em'>) => (
    <em className='text-inherit italic' {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className='text-strong' {...props} />
  ),
  a: ({ href, children, ...props }: AnchorProps) => {
    const className = 'text-accent-11 hover:text-accent-9'
    if (href?.startsWith('/')) {
      return (
        <Link href={href} className={className} {...props}>
          {children}
        </Link>
      )
    }
    if (href?.startsWith('#')) {
      return (
        <a href={href} className={className} {...props}>
          {children}
        </a>
      )
    }
    return (
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className={className}
        {...props}
      >
        {children}
      </a>
    )
  },
  code: ({ children, className }: CodeProps) => {
    if (className === undefined) {
      return <Code>{children}</Code>
    }

    return (
      <CodePreview language={className?.replace('language-', '')}>
        {children?.toString() ?? ''}
      </CodePreview>
    )
  },
  table: (props: ComponentPropsWithoutRef<'table'>) => (
    <div className='-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0'>
      <table className='w-full min-w-100 border-collapse text-sm' {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<'thead'>) => <thead {...props} />,
  th: (props: ComponentPropsWithoutRef<'th'>) => (
    <th
      className='border-b border-subtle py-2 pr-4 text-left font-semibold whitespace-nowrap'
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<'td'>) => (
    <td className='border-b border-subtler py-2 pr-4 text-subtle' {...props} />
  ),
  tr: (props: ComponentPropsWithoutRef<'tr'>) => <tr {...props} />,
  Table: ({ data }: { data: { headers: string[]; rows: string[][] } }) => (
    <div className='mb-8 overflow-x-auto'>
      <table className='w-full border-collapse text-sm'>
        <thead>
          <tr>
            {data.headers.map((header, index) => (
              <th
                key={index}
                className='border-b border-subtle py-2 pr-4 text-left font-semibold'
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-subtler'>
          {data.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className='py-2 pr-4'>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
  blockquote: (props: BlockquoteProps) => (
    <blockquote
      className='ml-[0.075em] border-l-[3px] border-normal pl-4 text-subtle'
      {...props}
    />
  )
}

declare global {
  type MDXProvidedComponents = typeof components
}

export function useMDXComponents(): MDXProvidedComponents {
  return components
}
