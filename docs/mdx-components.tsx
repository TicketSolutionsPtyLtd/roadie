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
  View,
  type ViewProps
} from '@oztix/roadie-components'
import { css } from '@oztix/roadie-core/css'

type ListProps = ViewProps
type AnchorProps = ComponentPropsWithoutRef<'a'>
type BlockquoteProps = ComponentPropsWithoutRef<'blockquote'>

const components = {
  h1: (props: HeadingProps) => (
    <Heading as='h1' textStyle='display.prose.1' mb='200' pt='400' {...props} />
  ),
  h2: (props: HeadingProps) => (
    <Heading as='h2' textStyle='display.prose.2' mb='200' mt='600' {...props} />
  ),
  h3: (props: HeadingProps) => (
    <Heading as='h3' textStyle='display.prose.3' mb='200' mt='600' {...props} />
  ),
  h4: (props: HeadingProps) => (
    <Heading as='h4' textStyle='display.prose.4' mb='200' mt='400' {...props} />
  ),
  h5: (props: HeadingProps) => (
    <Heading as='h5' textStyle='display.prose.5' mb='200' mt='400' {...props} />
  ),
  h6: (props: HeadingProps) => (
    <Heading as='h6' textStyle='display.prose.6' mb='200' mt='400' {...props} />
  ),
  p: (props: TextProps) => <Text as='p' textStyle='prose' fontSize='lg' mb='200' {...props} />,
  ol: (props: ListProps) => (
    <View as='ol' listStyleType='decimal' gap='200' mb='400' pl='400' {...props} />
  ),
  ul: (props: ListProps) => (
    <View as='ul' listStyleType='disc' gap='200' mb='400' pl='400' {...props} />
  ),
  li: (props: TextProps) => <Text as='li' pl='100' fontSize='lg' textStyle='prose' {...props} />,
  em: (props: TextProps) => <Text {...props} as='em' fontStyle='italic' fontSize='inherit' />,
  strong: (props: TextProps) => (
    <Text {...props} as='strong' fontWeight='bold' fontSize='inherit' />
  ),
  a: ({ href, children, ...props }: AnchorProps) => {
    const className = css({
      color: 'fg.accent',
      _hover: { color: 'fg.accent.hovered' }
    })
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
      <a href={href} target='_blank' rel='noopener noreferrer' className={className} {...props}>
        {children}
      </a>
    )
  },
  code: ({ children, className }: CodeProps) => {
    if (className === undefined) {
      return <Code fontSize='md'>{children}</Code>
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
      className={css({
        borderLeft: '3px solid',
        ml: '0.075em',
        pl: '200',
        color: 'fg.subtle'
      })}
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
