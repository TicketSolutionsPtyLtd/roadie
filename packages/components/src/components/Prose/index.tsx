import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export interface ProseProps extends ComponentProps<'div'> {}

/**
 * Prose container for long-form/rich content (CMS output, markdown, user HTML).
 * Applies semantic typography styles to nested HTML elements.
 */
export function Prose({ className, ...props }: ProseProps) {
  return (
    <div
      className={cn(
        [
          'text-prose text-default',
          // Vertical rhythm
          '[&>*+*]:mt-4',
          // Headings
          '[&_h1]:text-display-prose-1 [&_h1]:text-strong [&_h1]:mt-8',
          '[&_h2]:text-display-prose-2 [&_h2]:text-strong [&_h2]:mt-8',
          '[&_h3]:text-display-prose-3 [&_h3]:text-strong [&_h3]:mt-6',
          '[&_h4]:text-display-prose-4 [&_h4]:text-strong [&_h4]:mt-6',
          '[&_h5]:text-display-prose-5 [&_h5]:text-strong [&_h5]:mt-4',
          '[&_h6]:text-display-prose-6 [&_h6]:text-strong [&_h6]:mt-4',
          // Links
          '[&_a]:underline [&_a]:underline-offset-2',
          // Lists
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul>li+li]:mt-1',
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol>li+li]:mt-1',
          // Blockquote
          '[&_blockquote]:border-l-[3px] [&_blockquote]:border-default [&_blockquote]:pl-4 [&_blockquote]:text-subtle',
          // Code
          '[&_:not(pre)>code]:bg-subtler [&_:not(pre)>code]:rounded [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.9em] [&_:not(pre)>code]:font-mono',
          // Pre
          '[&_pre]:bg-sunken [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:font-mono',
          // HR
          '[&_hr]:my-8',
          // Images
          '[&_img]:rounded-md',
          // Tables
          '[&_table]:w-full [&_table]:text-sm',
          '[&_th]:text-left [&_th]:font-semibold [&_th]:py-2 [&_th]:pr-4 [&_th]:border-b [&_th]:border-subtle',
          '[&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:border-subtler',
          // Strong/em
          '[&_strong]:font-semibold [&_strong]:text-strong'
        ],
        className
      )}
      {...props}
    />
  )
}

Prose.displayName = 'Prose'
