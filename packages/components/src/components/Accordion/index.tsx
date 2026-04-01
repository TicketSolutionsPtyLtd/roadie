'use client'

import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useState
} from 'react'

import { Collapsible } from '@base-ui/react/collapsible'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

// --- Context ---

type AccordionType = 'single' | 'multiple'

interface AccordionContextValue {
  type: AccordionType
  openItems: string[]
  toggle: (value: string) => void
}

const AccordionContext = createContext<AccordionContextValue>({
  type: 'single',
  openItems: [],
  toggle: () => {}
})

interface ItemContextValue {
  value: string
  isOpen: boolean
}

const ItemContext = createContext<ItemContextValue>({
  value: '',
  isOpen: false
})

// --- Variants ---

export const accordionVariants = cva('flex flex-col w-full', {
  variants: {
    appearance: {
      default: '',
      contained: '[&>*+*]:border-t [&>*+*]:emphasis-subtle-border'
    }
  },
  defaultVariants: {
    appearance: 'default'
  }
})

// --- Components ---

export interface AccordionProps
  extends ComponentProps<'div'>,
    VariantProps<typeof accordionVariants> {
  type?: AccordionType
}

function AccordionRoot({
  type = 'single',
  appearance,
  className,
  ...props
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggle = useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        if (prev.includes(value)) {
          return prev.filter((v) => v !== value)
        }
        return type === 'single' ? [value] : [...prev, value]
      })
    },
    [type]
  )

  return (
    <AccordionContext.Provider value={{ type, openItems, toggle }}>
      <div
        className={cn(accordionVariants({ appearance, className }))}
        {...props}
      />
    </AccordionContext.Provider>
  )
}

AccordionRoot.displayName = 'Accordion'

interface AccordionItemProps extends ComponentProps<'div'> {
  value: string
}

function AccordionItem({
  value,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const { openItems, toggle } = useContext(AccordionContext)
  const isOpen = openItems.includes(value)

  return (
    <ItemContext.Provider value={{ value, isOpen }}>
      <Collapsible.Root open={isOpen} onOpenChange={() => toggle(value)}>
        <div className={cn('overflow-hidden', className)} {...props}>
          {children}
        </div>
      </Collapsible.Root>
    </ItemContext.Provider>
  )
}

AccordionItem.displayName = 'Accordion.Item'

function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<'button'>) {
  return (
    <Collapsible.Trigger
      className={cn(
        'flex items-center w-full text-left cursor-pointer font-medium emphasis-default-fg hover:emphasis-subtle-surface transition-all py-3',
        className
      )}
      {...props}
    >
      {children}
    </Collapsible.Trigger>
  )
}

AccordionTrigger.displayName = 'Accordion.Trigger'

function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <Collapsible.Panel
      className={cn(
        'overflow-hidden transition-all data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp',
        className
      )}
      {...props}
    >
      {children}
    </Collapsible.Panel>
  )
}

AccordionContent.displayName = 'Accordion.Content'

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent
})
