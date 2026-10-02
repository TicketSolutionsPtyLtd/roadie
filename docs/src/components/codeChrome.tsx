'use client'

import { type CSSProperties, type ReactNode, useSyncExternalStore } from 'react'

import { ArrowSquareOutIcon, CopyIcon } from '@phosphor-icons/react'
import { Highlight, themes } from 'prism-react-renderer'

import { Button, IconButton } from '@oztix/roadie-components/button'

import { useCopy } from './useCopy'

const darkTheme = {
  ...themes.nightOwl,
  plain: {
    ...themes.nightOwl.plain,
    backgroundColor: 'var(--intent-bg-sunken)'
  }
}

const lightTheme = {
  ...themes.nightOwlLight,
  plain: {
    ...themes.nightOwlLight.plain,
    backgroundColor: 'var(--intent-bg-sunken)'
  }
}

export type CodeTheme = typeof lightTheme

function subscribeToColorMode(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  return () => observer.disconnect()
}

const readColorMode = () =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light'

export function useCodeTheme(): CodeTheme {
  const colorMode = useSyncExternalStore(
    subscribeToColorMode,
    readColorMode,
    () => 'light'
  )
  return colorMode === 'dark' ? darkTheme : lightTheme
}

export const MAX_COLLAPSED_LINES = 5
// 5 lines of font-mono text-sm (~24px) + 32px padding: the fifth line clips under the gradient.
const COLLAPSED_HEIGHT_PX = 5 * 24 + 32

export const collapseStyle = (collapsed: boolean): CSSProperties | undefined =>
  collapsed
    ? { maxHeight: `${COLLAPSED_HEIGHT_PX}px`, overflow: 'hidden' }
    : undefined

/** `tsx` for a `tsx-live-noinline` fence. */
export const highlightLanguageOf = (fence: string) => fence.replace(/-.*/, '')

export const canCollapse = (code: string) =>
  code.split('\n').length > MAX_COLLAPSED_LINES

/** Prism-highlighted code; `collapsed` renders only the lines that show, which keeps long pages light. */
export function HighlightedCode({
  code,
  language,
  theme,
  collapsed = false,
  label = true
}: {
  code: string
  language: string
  theme: CodeTheme
  collapsed?: boolean
  label?: boolean
}) {
  const shown = collapsed
    ? code
        .split('\n')
        .slice(0, MAX_COLLAPSED_LINES + 1)
        .join('\n')
    : code
  return (
    <Highlight code={shown} language={language} theme={theme}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre
          // Focusable so keyboard users can scroll wide code sideways.
          tabIndex={0}
          role='group'
          aria-label={label ? `Code, ${language}` : undefined}
          className='min-w-0 overflow-x-auto p-3 font-mono text-xs sm:p-4 sm:text-sm'
          style={{ scrollbarWidth: 'none' }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}

export function ViewCodeShade({
  expanded,
  onToggle
}: {
  expanded: boolean
  onToggle: () => void
}) {
  if (expanded) {
    return (
      <div className='flex justify-center border-t border-subtler bg-subtler py-1.5'>
        <button
          type='button'
          onClick={onToggle}
          className='is-interactive rounded-full px-3 py-1 text-sm text-subtle hover:text-normal'
        >
          Hide code
        </button>
      </div>
    )
  }
  return (
    <>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--intent-bg-sunken)] to-transparent'
      />
      <button
        type='button'
        onClick={onToggle}
        className='is-interactive absolute bottom-3 left-1/2 -translate-x-1/2 emphasis-normal rounded-full px-4 py-1.5 text-sm font-medium'
      >
        View code
      </button>
    </>
  )
}

export function CodeActions({
  code,
  exampleHref
}: {
  code: string
  exampleHref?: string
}) {
  const { copied, copy } = useCopy()

  return (
    <div className='absolute top-2 right-2 z-docked flex gap-2'>
      {exampleHref && (
        <IconButton
          href={exampleHref}
          target='_blank'
          size='sm'
          emphasis='normal'
          aria-label='Open example in a new tab'
        >
          <ArrowSquareOutIcon weight='bold' className='size-4' />
        </IconButton>
      )}
      <Button
        onClick={() => copy(code)}
        size='sm'
        emphasis='normal'
        aria-label='Copy code to clipboard'
      >
        {copied && 'Copied!'}
        <CopyIcon weight='bold' className='size-4' />
      </Button>
    </div>
  )
}

/** The code half of a block: actions, a collapsible body, and the show/hide control. */
export function CodePanel({
  code,
  exampleHref,
  showActions = true,
  expanded,
  onExpandedChange,
  children
}: {
  code: string
  exampleHref?: string
  showActions?: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  children: ReactNode
}) {
  const collapsible = canCollapse(code)
  const collapsed = collapsible && !expanded
  return (
    <>
      <div className='relative min-w-0' style={collapseStyle(collapsed)}>
        {showActions && <CodeActions code={code} exampleHref={exampleHref} />}
        {children}
        {collapsed && (
          <ViewCodeShade
            expanded={false}
            onToggle={() => onExpandedChange(true)}
          />
        )}
      </div>
      {collapsible && expanded && (
        <ViewCodeShade expanded onToggle={() => onExpandedChange(false)} />
      )}
    </>
  )
}
