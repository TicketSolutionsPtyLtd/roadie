'use client'

import { type CSSProperties, type ReactNode, useSyncExternalStore } from 'react'

import {
  ArrowSquareOutIcon,
  CheckIcon,
  CopyIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  MonitorIcon
} from '@phosphor-icons/react'
import { Highlight, themes } from 'prism-react-renderer'

import { IconButton } from '@oztix/roadie-components/button'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'

import { DEVICES, type Device } from './exampleDevices'
import { useCopyToast } from './useCopy'

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
          className='is-interactive rounded-full emphasis-subtler border-0 px-3 py-1 text-sm text-subtle'
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
        className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-(--intent-bg-sunken) to-transparent'
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

/** A bleed-x fence runs its example to the preview's sides. */
export const previewSpacing = (language: string) =>
  /^(?:tsx|jsx)-live-bleed-x/.test(language)
    ? 'py-4 sm:py-6'
    : 'px-4 py-4 sm:px-6 sm:py-6'

const DEVICE_ICONS = {
  phone: DeviceMobileIcon,
  tablet: DeviceTabletIcon,
  desktop: MonitorIcon
}

/** The bar along the top of a live example: the preview width, then its actions. */
export function ExampleHeader({
  device,
  onDeviceChange,
  exampleHref,
  fullWidth
}: {
  /** Undefined until the client knows the screen, so nothing is pressed. */
  device?: Device
  onDeviceChange: (device: Device) => void
  exampleHref?: string
  /** The Full width control, on an expandable example. */
  fullWidth?: ReactNode
}) {
  return (
    <div
      data-not-prose
      className='flex items-center gap-2 border-b border-subtle bg-normal p-2'
    >
      <ToggleGroup
        aria-label='Preview width'
        size='sm'
        emphasis='subtler'
        value={device ? [device] : []}
        onValueChange={([next]) => next && onDeviceChange(next)}
      >
        {DEVICES.map(({ value, label }) => {
          const Icon = DEVICE_ICONS[value]
          return (
            <ToggleGroup.Item key={value} value={value} aria-label={label}>
              <Icon weight='bold' className='size-4' />
            </ToggleGroup.Item>
          )
        })}
      </ToggleGroup>
      <div className='flex flex-1 items-center justify-end gap-1'>
        {fullWidth && <div className='max-md:hidden'>{fullWidth}</div>}
        {exampleHref && (
          <IconButton
            href={exampleHref}
            target='_blank'
            size='sm'
            emphasis='subtler'
            aria-label='Open example in a new tab'
          >
            <ArrowSquareOutIcon weight='bold' className='size-4' />
          </IconButton>
        )}
      </div>
    </div>
  )
}

/** Copies the code; the icon turns to a tick for a moment and a toast says it worked. */
export function CopyButton({ code }: { code: string }) {
  const { copied, copy } = useCopyToast()

  return (
    <IconButton
      onClick={() =>
        copy(code, {
          copied: 'Code copied',
          failed: 'Couldn’t copy the code',
          failedDescription: 'Select the code and copy it yourself.'
        })
      }
      size='sm'
      emphasis='normal'
      aria-label='Copy code'
      className='absolute top-2 right-2 z-docked'
    >
      {copied ? (
        <CheckIcon weight='bold' className='size-4' />
      ) : (
        <CopyIcon weight='bold' className='size-4' />
      )}
    </IconButton>
  )
}

/** The code half of a block: the copy button, a collapsible body, and the show/hide control. */
export function CodePanel({
  code,
  showCopy = true,
  expanded,
  onExpandedChange,
  children
}: {
  code: string
  showCopy?: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  children: ReactNode
}) {
  const collapsible = canCollapse(code)
  const collapsed = collapsible && !expanded
  return (
    <div data-not-prose>
      <div className='relative min-w-0' style={collapseStyle(collapsed)}>
        {showCopy && <CopyButton code={code} />}
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
    </div>
  )
}
