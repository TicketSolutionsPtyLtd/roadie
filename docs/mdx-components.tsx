import type { ComponentPropsWithoutRef } from 'react'

import { Link } from 'next-view-transitions'

import { CodePreview } from '@/components/CodePreview'

import {
  Code,
  type CodeProps,
  Heading,
  type HeadingProps,
  Text,
  type TextProps,
} from '@oztix/roadie-components'

type AnchorProps = ComponentPropsWithoutRef<'a'>
type BlockquoteProps = ComponentPropsWithoutRef<'blockquote'>

const components = {
  h1: (props: HeadingProps) => (
    <Heading as="h1" size="4xl" className="mb-4 pt-8" {...props} />
  ),
  h2: (props: HeadingProps) => (
    <Heading as="h2" size="3xl" className="mb-4 mt-12" {...props} />
  ),
  h3: (props: HeadingProps) => (
    <Heading as="h3" size="2xl" className="mb-4 mt-12" {...props} />
  ),
  h4: (props: HeadingProps) => (
    <Heading as="h4" size="xl" className="mb-4 mt-8" {...props} />
  ),
  h5: (props: HeadingProps) => (
    <Heading as="h5" size="lg" className="mb-4 mt-8" {...props} />
  ),
  h6: (props: HeadingProps) => (
    <Heading as="h6" size="base" className="mb-4 mt-8" {...props} />
  ),
  p: (props: TextProps) => (
    <Text as="p" size="lg" className="mb-4 leading-relaxed" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal flex flex-col gap-2 mb-8 pl-8" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc flex flex-col gap-2 mb-8 pl-8" {...props} />
  ),
  li: (props: TextProps) => (
    <Text as="li" size="lg" className="pl-1 leading-relaxed" {...props} />
  ),
  em: (props: TextProps) => (
    <Text {...props} as="em" className="italic text-[inherit]" />
  ),
  strong: (props: TextProps) => (
    <Text {...props} as="strong" emphasis="strong" className="text-[inherit]" />
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
        target="_blank"
        rel="noopener noreferrer"
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
  Table: ({ data }: { data: { headers: string[]; rows: string[][] } }) => (
    <table>
      <thead>
        <tr>
          {data.headers.map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  blockquote: (props: BlockquoteProps) => (
    <blockquote
      className="border-l-[3px] border-neutral-7 ml-[0.075em] pl-4 emphasis-subtle-fg"
      {...props}
    />
  ),
}

declare global {
  type MDXProvidedComponents = typeof components
}

export function useMDXComponents(): MDXProvidedComponents {
  return components
}
