'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// Temporary: ?debug=taps logs what happens around a tapped suggestion, for a
// real phone. Docs only; remove before the PR merges.
const EVENTS = [
  'pointerdown',
  'pointerup',
  'pointercancel',
  'touchstart',
  'touchend',
  'touchcancel',
  'mousedown',
  'mouseup',
  'click',
  'focusin',
  'focusout',
  'blur',
  'input',
  'change',
  'keydown'
] as const

const describe = (node: EventTarget | null) => {
  if (!(node instanceof Element)) return node ? String(node) : 'null'
  const role = node.getAttribute('role')
  const slot = node.getAttribute('data-slot')
  const label =
    node.getAttribute('aria-label') ??
    node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 18)
  return [
    node.tagName.toLowerCase(),
    role && `[${role}]`,
    slot && `{${slot}}`,
    label && `"${label}"`
  ]
    .filter(Boolean)
    .join('')
}

const noSubscription = () => () => {}

const relevant = (node: EventTarget | null) =>
  node instanceof Element &&
  !!node.closest('[role="listbox"], [role="option"], [role="combobox"]')

export function TapDebug() {
  const on = useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(location.search).get('debug') === 'taps',
    () => false
  )
  const [lines, setLines] = useState<string[]>([])
  const start = useRef(0)

  useEffect(() => {
    if (!on) return
    start.current = performance.now()
    const log = (text: string) =>
      setLines((previous) =>
        [
          ...previous,
          `${Math.round(performance.now() - start.current)} ${text}`
        ].slice(-300)
      )
    const onEvent = (event: Event) => {
      const target = event.target
      const related = (event as FocusEvent).relatedTarget ?? null
      if (!relevant(target) && !relevant(related)) return
      const parts = [event.type, describe(target)]
      if (event instanceof PointerEvent)
        parts.push(
          `${event.pointerType} ${Math.round(event.clientX)},${Math.round(event.clientY)}`
        )
      if (event instanceof TouchEvent) {
        const touch = event.changedTouches[0]
        if (touch)
          parts.push(
            `${Math.round(touch.clientX)},${Math.round(touch.clientY)}`
          )
      }
      if (event.type.startsWith('focus') || event.type === 'blur')
        parts.push(`related=${describe(related)}`)
      if (event.type === 'input' || event.type === 'change')
        parts.push(`value="${(target as HTMLInputElement).value}"`)
      if (event.defaultPrevented) parts.push('prevented')
      log(parts.join(' '))
    }
    // Bubble phase on window, so defaultPrevented shows what handlers did.
    for (const type of EVENTS) window.addEventListener(type, onEvent, true)
    const late = (event: Event) => {
      if (!relevant(event.target)) return
      if (event.defaultPrevented) log(`${event.type} prevented by a handler`)
    }
    for (const type of EVENTS) window.addEventListener(type, late)

    const onViewport = (event: Event) => {
      const viewport = window.visualViewport!
      log(
        `viewport ${event.type} h=${Math.round(viewport.height)} top=${Math.round(viewport.offsetTop)}`
      )
    }
    window.visualViewport?.addEventListener('resize', onViewport)
    window.visualViewport?.addEventListener('scroll', onViewport)
    const onScroll = (event: Event) => {
      const target = event.target
      if (target === document)
        log(`window scroll y=${Math.round(window.scrollY)}`)
      else if (
        target instanceof Element &&
        target.matches('[data-slot="drawer-body"]')
      )
        log(`drawer scroll top=${Math.round(target.scrollTop)}`)
    }
    window.addEventListener('scroll', onScroll, true)

    // Base UI's open and value changes aren't reachable from the docs, so the
    // list appearing and the input's value are read from the page instead.
    let listShown = false
    let values = new Map<Element, string>()
    const check = () => {
      const shown = !!document.querySelector('[role="listbox"]')
      if (shown !== listShown) {
        listShown = shown
        log(shown ? 'list opened' : 'list closed')
      }
      const next = new Map<Element, string>()
      for (const input of document.querySelectorAll<HTMLInputElement>(
        'input[role="combobox"]'
      )) {
        next.set(input, input.value)
        if (values.has(input) && values.get(input) !== input.value)
          log(`value ${describe(input)} -> "${input.value}"`)
      }
      values = next
    }
    const observer = new MutationObserver(check)
    observer.observe(document.body, { subtree: true, childList: true })
    // A controlled input's value is a property, which no observer sees.
    const poll = setInterval(check, 50)
    log('logging taps')
    return () => {
      for (const type of EVENTS) {
        window.removeEventListener(type, onEvent, true)
        window.removeEventListener(type, late)
      }
      window.visualViewport?.removeEventListener('resize', onViewport)
      window.visualViewport?.removeEventListener('scroll', onViewport)
      window.removeEventListener('scroll', onScroll, true)
      observer.disconnect()
      clearInterval(poll)
    }
  }, [on])

  if (!on) return null
  return (
    // Untouchable, so a tap on it can't close the drawer; newest first.
    <div className='pointer-events-none fixed inset-x-2 top-1 z-[2147483647] grid max-h-[24vh] gap-0.5 overflow-hidden rounded-lg border border-normal bg-raised/90 p-1.5 font-mono text-[9px] leading-tight text-normal shadow-xl'>
      {lines
        .slice()
        .reverse()
        .map((line, index) => (
          <div key={index}>{line}</div>
        ))}
    </div>
  )
}
