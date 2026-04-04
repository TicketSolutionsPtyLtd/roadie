import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const proseVariants = cva(
  [
    'text-prose text-normal',
    // Links
    '[&_a]:underline [&_a]:underline-offset-2',
    // Lists
    '[&_ul]:list-disc [&_ul]:pl-6',
    '[&_ol]:list-decimal [&_ol]:pl-6',
    // Blockquote
    '[&_blockquote]:border-l-[3px] [&_blockquote]:border-normal [&_blockquote]:pl-4 [&_blockquote]:text-subtle',
    // Code
    '[&_:not(pre)>code]:bg-subtler [&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.9em] [&_:not(pre)>code]:font-mono',
    // Pre
    '[&_pre]:bg-sunken [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:font-mono',
    // Images
    '[&_img]:rounded-lg',
    // Tables
    '[&_table]:w-full',
    '[&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-subtle',
    '[&_td]:border-b [&_td]:border-subtler',
    // Strong/em
    '[&_strong]:font-semibold [&_strong]:text-strong'
  ],
  {
    variants: {
      size: {
        sm: [
          'text-sm',
          '[&>*+*]:mt-2',
          '[&_h1]:text-display-ui-2 [&_h1]:text-strong [&_h1]:mt-4',
          '[&_h2]:text-display-ui-3 [&_h2]:text-strong [&_h2]:mt-4',
          '[&_h3]:text-display-ui-4 [&_h3]:text-strong [&_h3]:mt-3',
          '[&_h4]:text-display-ui-5 [&_h4]:text-strong [&_h4]:mt-3',
          '[&_h5]:text-display-ui-6 [&_h5]:text-strong [&_h5]:mt-2',
          '[&_h6]:text-display-ui-6 [&_h6]:text-strong [&_h6]:mt-2',
          '[&_ul>li+li]:mt-0.5 [&_ol>li+li]:mt-0.5',
          '[&_pre]:p-3 [&_pre]:text-xs',
          '[&_th]:py-1.5 [&_th]:pr-3 [&_td]:py-1.5 [&_td]:pr-3',
          '[&_hr]:my-4'
        ],
        md: [
          '[&>*+*]:mt-4',
          '[&_h1]:text-display-prose-1 [&_h1]:text-strong [&_h1]:mt-8',
          '[&_h2]:text-display-prose-2 [&_h2]:text-strong [&_h2]:mt-8',
          '[&_h3]:text-display-prose-3 [&_h3]:text-strong [&_h3]:mt-6',
          '[&_h4]:text-display-prose-4 [&_h4]:text-strong [&_h4]:mt-6',
          '[&_h5]:text-display-prose-5 [&_h5]:text-strong [&_h5]:mt-4',
          '[&_h6]:text-display-prose-6 [&_h6]:text-strong [&_h6]:mt-4',
          '[&_ul>li+li]:mt-1 [&_ol>li+li]:mt-1',
          '[&_pre]:p-4 [&_pre]:text-sm',
          '[&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4',
          '[&_hr]:my-8'
        ],
        lg: [
          'text-lg',
          '[&>*+*]:mt-6',
          '[&_h1]:text-display-prose-1 [&_h1]:text-strong [&_h1]:mt-12',
          '[&_h2]:text-display-prose-2 [&_h2]:text-strong [&_h2]:mt-10',
          '[&_h3]:text-display-prose-3 [&_h3]:text-strong [&_h3]:mt-8',
          '[&_h4]:text-display-prose-4 [&_h4]:text-strong [&_h4]:mt-6',
          '[&_h5]:text-display-prose-5 [&_h5]:text-strong [&_h5]:mt-6',
          '[&_h6]:text-display-prose-6 [&_h6]:text-strong [&_h6]:mt-4',
          '[&_ul>li+li]:mt-2 [&_ol>li+li]:mt-2',
          '[&_pre]:p-6 [&_pre]:text-sm',
          '[&_th]:py-3 [&_th]:pr-4 [&_td]:py-3 [&_td]:pr-4',
          '[&_hr]:my-12'
        ]
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
)

export interface ProseProps
  extends ComponentProps<'div'>,
    VariantProps<typeof proseVariants> {}

/**
 * Prose container for long-form/rich content (CMS output, markdown, user HTML).
 * Applies semantic typography styles to nested HTML elements.
 */
export function Prose({ className, size, ...props }: ProseProps) {
  return <div className={cn(proseVariants({ size, className }))} {...props} />
}

Prose.displayName = 'Prose'
