'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button, Card, Tabs } from '@oztix/roadie-components'
import { CartExpiryDialogs } from '@oztix/roadie-widgets/cart-drawer/react'

import { CodePreview } from './CodePreview'
import { VueCartExpiryDialogs } from './VueCartExpiryDialogs'

type Skin = 'react' | 'vue'

// Per-skin usage shown under the tab so the import path + binding style is
// visible while switching. Kept short so CodePreview shows it all.
const SKIN_CODE: Record<Skin, string> = {
  react: `import { CartExpiryDialogs, useCartExpiry } from '@oztix/roadie-widgets/cart-drawer/react'

const { remaining, expired, showWarning, dismissWarning } = useCartExpiry(expiresAtUtc)
<CartExpiryDialogs showWarning={showWarning} expired={expired} remaining={remaining}
  onDismissWarning={dismissWarning} checkoutUrl={url} browseHref="/events" onNavigate={go} />`,
  vue: `import { CartExpiryDialogs, useCartExpiry } from '@oztix/roadie-widgets/cart-drawer/vue'

const { remaining, expired, showWarning, dismissWarning } = useCartExpiry(() => expiresAtUtc)
<CartExpiryDialogs :show-warning="showWarning" :expired="expired" :remaining="remaining"
  :on-dismiss-warning="dismissWarning" :checkout-url="url" browse-href="/events" :on-navigate="go" />`
}

// Standalone state instead of useCartExpiry so each dialog can be triggered on
// demand — the composable derives showWarning/expired from a live countdown.
export function CartExpiryDialogsDemo() {
  const [skin, setSkin] = useState<Skin>('react')
  const [showWarning, setShowWarning] = useState(false)
  const [expired, setExpired] = useState(false)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(90)

  // Derive from a fixed end-time each tick — like the real useCartExpiry — so
  // NumberFlow animates the digits down and stray ticks can't accelerate it.
  useEffect(() => {
    if (!showWarning || expired || endsAt == null) return
    const tick = () =>
      setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [showWarning, expired, endsAt])

  const reset = useCallback(() => {
    setShowWarning(false)
    setExpired(false)
  }, [])

  // Real apps route here; reset so the blocking expired modal isn't a dead end.
  const onNavigate = useCallback(
    (href: string) => {
      window.alert('Navigate to: ' + href)
      reset()
    },
    [reset]
  )

  const modalProps = {
    showWarning,
    expired,
    remaining,
    onDismissWarning: () => setShowWarning(false),
    checkoutUrl: '/checkout',
    browseHref: '/events',
    onNavigate
  }

  return (
    <div className='mb-8'>
      <Card emphasis='normal'>
        <Card.Content className='grid gap-4'>
          <Tabs
            value={skin}
            onValueChange={(value) => {
              reset()
              setSkin(value as Skin)
            }}
            emphasis='strong'
          >
            <Tabs.List>
              <Tabs.Tab value='react'>React</Tabs.Tab>
              <Tabs.Tab value='vue'>Vue</Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
          </Tabs>

          <div className='flex flex-wrap gap-2'>
            <Button
              intent='accent'
              emphasis='strong'
              onClick={() => {
                setExpired(false)
                setRemaining(90)
                setEndsAt(Date.now() + 90_000)
                setShowWarning(true)
              }}
            >
              Show “Still here?”
            </Button>
            <Button
              onClick={() => {
                setShowWarning(false)
                setExpired(true)
              }}
            >
              Show “Hold ended”
            </Button>
          </div>

          <CodePreview
            language='tsx'
            className='relative min-w-0 rounded-lg emphasis-sunken'
          >
            {SKIN_CODE[skin]}
          </CodePreview>

          {skin === 'react' ? (
            <CartExpiryDialogs {...modalProps} />
          ) : (
            <VueCartExpiryDialogs {...modalProps} />
          )}
        </Card.Content>
      </Card>
    </div>
  )
}
