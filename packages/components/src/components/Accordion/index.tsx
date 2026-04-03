'use client'

import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'

import { Collapsible } from '@base-ui/react/collapsible'
import { CaretDownIcon } from '@phosphor-icons/react'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

// --- Context ---

type AccordionType = 'single' | 'multiple'
type AccordionEmphasis = 'default' | 'subtle' | 'subtler' | null

interface AccordionContextValue {
  type: AccordionType
  emphasis: AccordionEmphasis
  openItems: string[]
  toggle: (value: string) => void
}

const AccordionContext = createContext<AccordionContextValue>({
  type: 'single',
  emphasis: 'default',
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

export const accordionVariants = cva('grid w-full', {
  variants: {
    intent: {
      neutral: 'intent-neutral',
      brand: 'intent-brand',
      accent: 'intent-accent',
      danger: 'intent-danger',
      success: 'intent-success',
      warning: 'intent-warning',
      info: 'intent-info'
    },
    emphasis: {
      default:
        'emphasis-default rounded-xl [&>*+*]:border-t [&>*+*]:border-subtle',
      subtle: 'gap-0.5',
      subtler: ''
    }
  },
  defaultVariants: {
    emphasis: 'default'
  }
})

const accordionItemVariants: Record<'default' | 'subtle' | 'subtler', string> =
  {
    default: '',
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

  const contextValue = useMemo(
    () => ({ type, emphasis: emphasis ?? 'default', openItems, toggle }),
    [type, emphasis, openItems, toggle]
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

interface AccordionItemProps extends ComponentProps<'div'> {
  value: string
}

function AccordionItem({
  value,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const { emphasis, openItems, toggle } = useContext(AccordionContext)
  const isOpen = openItems.includes(value)
  const itemEmphasis = accordionItemVariants[emphasis ?? 'default']

  return (
    <ItemContext.Provider value={{ value, isOpen }}>
      <Collapsible.Root
        open={isOpen}
        onOpenChange={() => toggle(value)}
        className={cn('overflow-hidden', itemEmphasis, className)}
        {...props}
      >
        {children}
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
        'group flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left font-medium text-default transition-colors hover:bg-subtle',
        className
      )}
      {...props}
    >
      {children}
      <CaretDownIcon
        weight='bold'
        className='duration-moderate size-4 shrink-0 text-subtle transition-transform group-data-[panel-open]:rotate-180'
      />
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
        'duration-moderate h-[var(--collapsible-panel-height)] overflow-hidden px-4 pt-1 pb-3 transition-[height] ease-enter data-[ending-style]:h-0 data-[starting-style]:h-0',
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
