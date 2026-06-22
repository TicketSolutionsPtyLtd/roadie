'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button, Card, Tabs } from '@oztix/roadie-components'
import type { CartDetails } from '@oztix/roadie-widgets/cart'
import { CartContents } from '@oztix/roadie-widgets/cart-contents/react'

import { CodePreview } from './CodePreview'
import { VueCartContents } from './VueCartContents'
import { type DemoCartClient, createDemoCart } from './cartDrawerDemo'

type Skin = 'react' | 'vue'
type Container = 'drawer' | 'page'

const SKIN_CODE: Record<Skin, string> = {
  react: `import { CartContents } from '@oztix/roadie-widgets/cart-contents/react'

// container="page" adds the header + footer and fills its container's height.
<div className="min-h-full">
  <CartContents cart={cart} container="page" onNavigate={go} browseHref="/events"
    checkoutUrl={url} locale="en-AU" currency="AUD" onRemoveEvent={remove} />
</div>`,
  vue: `import { CartContents } from '@oztix/roadie-widgets/cart-contents/vue'

<div class="min-h-full">
  <CartContents :cart="cart" container="page" :on-navigate="go" browse-href="/events"
    :checkout-url="url" locale="en-AU" currency="AUD" @remove-event="remove" />
</div>`
}

export function CartContentsParityDemo() {
  const [skin, setSkin] = useState<Skin>('react')
  const [container, setContainer] = useState<Container>('page')
  const [client, setClient] = useState<DemoCartClient>(() => createDemoCart())
  const [details, setDetails] = useState<CartDetails | null>(null)
  const [busy, setBusy] = useState(false)

  const refetch = useCallback(async (c: DemoCartClient) => {
    setDetails(await c.getDetails('demo-collection'))
  }, [])

  useEffect(() => {
    void refetch(client)
  }, [client, refetch])

  const removeEvent = useCallback(
    async (eventId: string) => {
      setBusy(true)
      try {
        await client.removeItem(details?.cartId ?? '', eventId)
        await refetch(client)
      } finally {
        setBusy(false)
      }
    },
    [client, details, refetch]
  )

  function addEvent() {
    client.addEvent()
    void refetch(client)
  }

  // Remove every event in series so the last-item → empty-state animation runs.
  async function emptyCart() {
    if (!details) return
    setBusy(true)
    try {
      for (const event of details.events) {
        await client.removeItem(details.cartId, event.eventId)
      }
      await refetch(client)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setClient(createDemoCart())
  }

  const go = (href: string) => window.alert('Navigate to: ' + href)

  const shared = details && {
    cart: details,
    onNavigate: go,
    browseHref: '/events',
    checkoutUrl: client.checkoutUrl(details),
    locale: 'en-AU',
    currency: 'AUD',
    container,
    busy,
    onRemoveEvent: removeEvent
  }

  return (
    <div className='mb-8'>
      <Card emphasis='normal'>
        <Card.Content className='grid gap-4'>
          {/* Tabs + controls + the framed cart all live in the card, so it reads
              as "this card is the <skin> skin under these toggles". */}
          <Tabs
            value={skin}
            onValueChange={(value) => setSkin(value as Skin)}
            emphasis='strong'
          >
            <Tabs.List>
              <Tabs.Tab value='react'>React</Tabs.Tab>
              <Tabs.Tab value='vue'>Vue</Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
          </Tabs>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              intent={container === 'page' ? 'accent' : 'neutral'}
              emphasis={container === 'page' ? 'strong' : 'normal'}
              onClick={() =>
                setContainer((c) => (c === 'page' ? 'drawer' : 'page'))
              }
            >
              container: {container}
            </Button>
            <Button onClick={addEvent}>Add event</Button>
            <Button onClick={emptyCart}>Empty cart</Button>
            <Button emphasis='subtle' onClick={reset}>
              Reset
            </Button>
          </div>

          {/* Fixed-height "page area": container="page" fills it (header, sticky
              footer, centred empty state); "drawer" is the body-only list. The
              Vue bridge wrapper is display:contents so both skins lay out as a
              direct child. px-4 lets the day headers full-bleed. */}
          <div className='h-[28rem] overflow-y-auto rounded-xl border border-subtle bg-normal px-4'>
            {shared &&
              (skin === 'react' ? (
                <CartContents {...shared} />
              ) : (
                <VueCartContents {...shared} />
              ))}
          </div>

          <CodePreview
            language='tsx'
            className='relative min-w-0 rounded-lg emphasis-sunken'
          >
            {SKIN_CODE[skin]}
          </CodePreview>
        </Card.Content>
      </Card>
    </div>
  )
}
