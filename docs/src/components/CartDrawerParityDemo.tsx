'use client'

import { useCallback, useState } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { Button, Card, RadioGroup, Tabs } from '@oztix/roadie-components'
import { CartDrawer } from '@oztix/roadie-widgets/cart-drawer/react'

import { VueCartDrawer } from './VueCartDrawer'
import { createDemoCart } from './cartDrawerDemo'

type Skin = 'react' | 'vue'

// A fresh cart + query client per "Show" so removing every item never strands
// the demo. Kept together so Add can reach the cart.
function makeDemoBundle() {
  return { cart: createDemoCart(), client: new QueryClient() }
}

export function CartDrawerParityDemo() {
  const [skin, setSkin] = useState<Skin>('react')
  const [shown, setShown] = useState(false)
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState<'collection' | 'event'>('collection')
  const [refreshKey, setRefreshKey] = useState(0)
  const [bundle, setBundle] = useState(makeDemoBundle)

  const show = useCallback(() => {
    setBundle(makeDemoBundle()) // fresh, full cart
    setRefreshKey(0)
    setShown(true)
  }, [])
  const hide = useCallback(() => {
    setShown(false)
    setOpen(false)
  }, [])

  function addToCart() {
    bundle.cart.addEvent() // demo-only helper
    setRefreshKey((k) => k + 1)
  }
  function adjustTimer(deltaMinutes: number) {
    bundle.cart.adjustExpiry(deltaMinutes)
    setRefreshKey((k) => k + 1)
  }

  // The drawer is uncontrolled — toggled by its own handle. Expand triggers
  // that handle so it animates instead of remounting. Works for both skins
  // (same aria-controls), and only one skin is mounted at a time.
  function toggleExpand() {
    document
      .querySelector<HTMLButtonElement>(
        'button[aria-controls="cart-drawer-body"]'
      )
      ?.click()
  }
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (!isOpen) {
        window.setTimeout(() => {
          const handle = document.querySelector(
            'button[aria-controls="cart-drawer-body"]'
          )
          if (!handle) hide()
        }, 400)
      }
    },
    [hide]
  )

  // Switching skins tears down whichever drawer is mounted; start clean so the
  // other skin doesn't inherit a half-open state.
  function switchSkin(next: Skin) {
    if (next === skin) return
    hide()
    setSkin(next)
  }

  const drawerProps = {
    cart: bundle.cart,
    collectionId: 'demo-collection',
    onNavigate: (href: string) => window.alert('Navigate to: ' + href),
    locale: 'en-AU',
    currency: 'AUD',
    context,
    refreshKey,
    initialState: 'closed' as const,
    onOpenChange: handleOpenChange
  }

  return (
    <div className='grid gap-3'>
      {/* The tab sits outside the card; everything it affects lives inside, so
          it reads as "this card is the <skin> skin". */}
      <Tabs
        value={skin}
        onValueChange={(value) => switchSkin(value as Skin)}
        emphasis='strong'
      >
        <Tabs.List>
          <Tabs.Tab value='react'>React</Tabs.Tab>
          <Tabs.Tab value='vue'>Vue</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
      </Tabs>

      <Card emphasis='raised'>
        <Card.Content className='grid gap-4'>
          <p className='text-sm text-subtle'>
            Same controls, same mock cart — flip the tab to compare the{' '}
            <strong className='font-medium text-normal'>{skin}</strong> skin.
            The drawer is <code>position: fixed</code> over the page.
          </p>

          <div className='grid gap-1.5'>
            <p className='text-sm font-medium text-strong'>Cart context</p>
            <RadioGroup
              value={context}
              onValueChange={(value) =>
                setContext(value as 'collection' | 'event')
              }
            >
              <RadioGroup.Item value='collection' label='Collection' />
              <RadioGroup.Item value='event' label='Event' />
            </RadioGroup>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              intent='accent'
              emphasis='strong'
              onClick={() => (shown ? hide() : show())}
            >
              {shown ? 'Hide cart' : 'Show cart'}
            </Button>
            <Button disabled={!shown} onClick={toggleExpand}>
              {open ? 'Collapse cart' : 'Expand cart'}
            </Button>
            <Button disabled={!shown} onClick={addToCart}>
              Add to cart
            </Button>
            <Button disabled={!shown} onClick={() => adjustTimer(-1)}>
              −1 min
            </Button>
            <Button disabled={!shown} onClick={() => adjustTimer(1)}>
              +1 min
            </Button>
          </div>

          {shown &&
            (skin === 'react' ? (
              <QueryClientProvider client={bundle.client}>
                <CartDrawer {...drawerProps} />
              </QueryClientProvider>
            ) : (
              <VueCartDrawer {...drawerProps} />
            ))}
        </Card.Content>
      </Card>
    </div>
  )
}
