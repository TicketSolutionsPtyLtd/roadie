'use client'

import {
  type ComponentProps,
  createContext,
  use,
  useCallback,
  useId,
  useMemo
} from 'react'

import { CaretDownIcon } from '@phosphor-icons/react'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

// --- Context ---

type AccordionType = 'single' | 'multiple'
type AccordionEmphasis = 'normal' | 'subtle' | 'subtler' | null

interface AccordionContextValue {
  name: string | undefined
  emphasis: AccordionEmphasis
}

const AccordionContext = createContext<AccordionContextValue>({
  name: undefined,
  emphasis: 'normal'
})

// --- Variants ---

export const accordionVariants = cva('grid w-full', {
  variants: {
    intent: intentVariants,
    emphasis: {
      normal:
        'emphasis-normal rounded-xl [&>*+*]:border-t [&>*+*]:border-subtle',
      subtle: 'gap-0.5',
      subtler: ''
    }
  },
  defaultVariants: {
    emphasis: 'normal'
  }
})

const accordionItemVariants: Record<'normal' | 'subtle' | 'subtler', string> = {
  normal: '',
  subtle: 'emphasis-subtle first:rounded-t-xl last:rounded-b-xl',
  subtler: ''
}

// --- Components ---

export interface AccordionProps
  extends ComponentProps<'div'>,
    VariantProps<typeof accordionVariants> {
  type?: AccordionType
}

function AccordionRoot({
  type = 'single',
  intent,
  emphasis,
  className,
  ...props
}: AccordionProps) {
  const id = useId()
  const name = type === 'single' ? `accordion-${id}` : undefined

  const contextValue = useMemo(
    () => ({ name, emphasis: emphasis ?? 'normal' }),
    [name, emphasis]
  )

  return (
    <AccordionContext.Provider value={contextValue}>
      <div
        className={cn(accordionVariants({ intent, emphasis, className }))}
        {...props}
      />
    </AccordionContext.Provider>
  )
}

AccordionRoot.displayName = 'Accordion'

type AccordionItemProps = ComponentProps<'details'>

function AccordionItem({ className, children, ...props }: AccordionItemProps) {
  const { name, emphasis } = use(AccordionContext)
  const itemEmphasis = accordionItemVariants[emphasis ?? 'normal']

  return (
    <details
      name={name}
      className={cn(
        'group/item is-disclosure-animated',
        itemEmphasis,
        className
      )}
      {...props}
    >
      {children}
    </details>
  )
}

AccordionItem.displayName = 'Accordion.Item'

function AccordionTrigger({
  className,
  children,
  onClick,
  ...props
}: ComponentProps<'summary'>) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      onClick?.(e)

      // Only measure for browsers without interpolate-size (Safari)
      if (
        typeof CSS !== 'undefined' &&
        CSS.supports?.('interpolate-size', 'allow-keywords')
      )
        return

      const details = e.currentTarget.closest('details')
      if (!details || details.open) return

      // Temporarily open to measure content, then close before browser toggles
      details.open = true
      const content = details.querySelector(
        ':scope > :not(summary)'
      ) as HTMLElement
      if (content?.scrollHeight) {
        details.style.setProperty(
          '--content-height',
          `${content.scrollHeight}px`
        )
      }
      details.open = false
    },
    [onClick]
  )

  return (
    <summary
      className={cn(
        'flex w-full cursor-pointer list-none items-center justify-between px-4 py-3 text-left font-medium text-normal transition-colors hover:bg-subtle [&::-webkit-details-marker]:hidden',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
      <CaretDownIcon
        weight='bold'
        className='duration-moderate size-4 shrink-0 text-subtle transition-transform ease-enter group-open/item:rotate-180'
      />
    </summary>
  )
}

AccordionTrigger.displayName = 'Accordion.Trigger'

function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn('min-h-0 overflow-hidden px-4 pt-1 pb-3', className)}
      {...props}
    >
      {children}
    </div>
  )
}

AccordionContent.displayName = 'Accordion.Content'

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent
})
