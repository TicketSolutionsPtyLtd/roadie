import { useEffect, useRef } from 'react'

// Bridges the Vue CartExpiryDialogs skin into the React docs so the expiry demo
// can render either skin from the same trigger controls. Vue + the widget's Vue
// dist are dynamically imported inside the effect so they never load during SSR.
// Mirrors VueCartDrawer — see that file for the no-'use client' rationale.

export type VueCartExpiryDialogsProps = {
  showWarning: boolean
  expired: boolean
  remaining: number | null
  onDismissWarning: () => void
  checkoutUrl: string | null
  browseHref: string
  onNavigate: (href: string) => void
}

type VueRuntime = {
  createApp: (options: unknown) => {
    mount: (el: Element) => void
    unmount: () => void
  }
  h: (type: unknown, props?: Record<string, unknown>) => unknown
  reactive: <T extends object>(target: T) => T
}

export function VueCartExpiryDialogs(props: VueCartExpiryDialogsProps) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const latest = useRef(props)
  latest.current = props
  const reactiveProps = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    let cancelled = false
    let unmount: (() => void) | null = null

    // Same dup-registration guard as VueCartDrawer: the warning modal rolls an
    // mm:ss countdown via @number-flow/vue, whose module-load
    // CSS.registerProperty clashes with the React build's on this two-skin page.
    const css = CSS as unknown as {
      registerProperty?: (d: PropertyDefinition) => void
      __nfDupePatched?: boolean
    }
    if (css.registerProperty && !css.__nfDupePatched) {
      const original = css.registerProperty.bind(CSS)
      css.registerProperty = (def) => {
        try {
          original(def)
        } catch {
          /* already registered by the other skin's number-flow build */
        }
      }
      css.__nfDupePatched = true
    }

    void (async () => {
      const [vue, widget] = await Promise.all([
        import('vue') as unknown as Promise<VueRuntime>,
        import('@oztix/roadie-widgets/cart-drawer/vue')
      ])
      if (cancelled || !elRef.current) return
      const { createApp, h, reactive } = vue
      const CartExpiryDialogs = widget.CartExpiryDialogs

      const rp = reactive({ ...latest.current }) as Record<string, unknown>
      reactiveProps.current = rp

      const app = createApp({
        render: () => h(CartExpiryDialogs, { ...rp })
      })
      app.mount(elRef.current)
      unmount = () => app.unmount()
    })()

    return () => {
      cancelled = true
      unmount?.()
      reactiveProps.current = null
    }
  }, [])

  useEffect(() => {
    if (reactiveProps.current) Object.assign(reactiveProps.current, props)
  })

  return <div ref={elRef} />
}
