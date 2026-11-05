'use client'

import { type ReactNode, useCallback, useState } from 'react'

import { ArrowsOutIcon } from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components/button'
import { Skeleton } from '@oztix/roadie-components/skeleton'

import { LazyLiveRunner, loadLiveRunner } from './LazyLiveRunner'
import {
  CodePanel,
  ExampleHeader,
  HighlightedCode,
  canCollapse,
  highlightLanguageOf,
  useCodeTheme
} from './codeChrome'
import { type Device, useViewportDevice } from './exampleDevices'
import {
  DEFAULT_PREVIEW_HEIGHT,
  exampleHeights,
  useNearViewport
} from './nearViewport'

type CodePreviewProps = {
  children: string
  language?: string
  showCopy?: boolean
  className?: string
  /** Adds a header button that opens the live example in a full-width dialog. A `-expand` fence suffix does the same. */
  expandable?: boolean
  /** The example's own page; adds a header action that opens it in a new tab. */
  exampleHref?: string
  /** Renders the live example on load instead of when it nears the viewport. An `eager` fence meta does the same. */
  eager?: boolean
  /** Classes the preview lays the example out with, from the fence's `layout=`, `gap=`, and `width=`. */
  previewLayout?: string
}

// MDX's `.prose` sets the rhythm there; the docs' own pages need the gap.
const BLOCK_SPACING = 'mb-8 in-[.prose]:mb-0'

/** What a live example shows until it renders, or if it can't: a reserved preview, or the error in its place, and its static code. */
function LivePlaceholder({
  code,
  language,
  heightKey,
  expanded,
  onExpandedChange,
  error
}: {
  code: string
  language: string
  heightKey: string
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  error?: ReactNode
}) {
  const theme = useCodeTheme()
  const highlightLanguage = highlightLanguageOf(language)
  return (
    <>
      {error ?? (
        <div
          data-live-example='pending'
          className='grid bg-normal p-4 sm:p-6'
          style={{
            minHeight: exampleHeights.get(heightKey) ?? DEFAULT_PREVIEW_HEIGHT
          }}
        >
          <Skeleton shape='block' emphasis='subtler' className='h-full' />
        </div>
      )}
      <CodePanel
        code={code}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      >
        <div className='emphasis-sunken'>
          <HighlightedCode
            code={code}
            language={highlightLanguage}
            theme={theme}
            collapsed={canCollapse(code) && !expanded}
          />
        </div>
      </CodePanel>
    </>
  )
}

function LiveExample({
  code,
  language,
  expandable,
  exampleHref,
  eager,
  typesets,
  previewLayout
}: {
  code: string
  language: string
  expandable: boolean
  exampleHref?: string
  eager: boolean
  typesets: boolean
  previewLayout?: string
}) {
  const [ref, near, onMounted] = useNearViewport<HTMLDivElement>(
    eager,
    loadLiveRunner
  )
  const [expanded, setExpanded] = useState(false)
  const [editorOpened, setEditorOpened] = useState(false)
  const viewportDevice = useViewportDevice()
  // Unpicked, the switch follows the screen, so a phone starts on Phone.
  const [picked, setPicked] = useState<Device>()
  const device = picked ?? viewportDevice
  const [fullWidth, setFullWidth] = useState(false)
  const [rendered, setRendered] = useState(false)
  const onRendered = useCallback(() => {
    setRendered(true)
    onMounted()
  }, [onMounted])
  const heightKey = exampleHref ?? `${code.length}:${code.slice(0, 120)}`
  const shared = {
    code,
    language,
    heightKey,
    expanded,
    onExpandedChange: (next: boolean) => {
      setExpanded(next)
      if (next) setEditorOpened(true)
    }
  }
  const placeholder = <LivePlaceholder {...shared} />

  return (
    <div
      ref={ref}
      // A typesetting demo escapes only its chrome, inside LiveRunner and
      // CodePanel, so the page's own Prose sets its preview.
      data-not-prose={!typesets || undefined}
      data-slot='live-example'
      // Clipped, not hidden, so an example's sticky part sticks in the page.
      className={`relative ${BLOCK_SPACING} min-w-0 overflow-clip rounded-xl border border-subtle`}
    >
      <ExampleHeader
        device={device}
        onDeviceChange={setPicked}
        exampleHref={exampleHref}
        fullWidth={
          expandable && (
            <Button
              size='sm'
              emphasis='subtler'
              disabled={!rendered}
              onClick={() => setFullWidth(true)}
            >
              <ArrowsOutIcon weight='bold' className='size-4' />
              Full width
            </Button>
          )
        }
      />
      {near ? (
        <LazyLiveRunner
          {...shared}
          loading={placeholder}
          frame={(error) => (
            <LivePlaceholder
              {...shared}
              error={<div className='bg-normal px-4 sm:px-6'>{error}</div>}
            />
          )}
          editorOpened={editorOpened}
          onMounted={onRendered}
          previewLayout={previewLayout}
          frameDevice={device === viewportDevice ? undefined : device}
          fullWidth={fullWidth}
          onFullWidthChange={setFullWidth}
        />
      ) : (
        placeholder
      )}
    </div>
  )
}

export function CodePreview({
  children,
  language = 'tsx',
  showCopy = true,
  className,
  expandable = false,
  exampleHref,
  eager = false,
  previewLayout
}: CodePreviewProps) {
  const theme = useCodeTheme()
  const [expanded, setExpanded] = useState(false)
  const isLiveLang = /^(?:tsx|jsx)-live/.test(language)
  const isLivePrefix =
    children.startsWith('live') && (language === 'tsx' || language === 'jsx')
  const code = isLivePrefix
    ? children.replace('live', '').trim()
    : children.trim()

  if (isLiveLang || isLivePrefix) {
    return (
      <LiveExample
        code={code}
        language={language}
        expandable={expandable || /-expand\b/.test(language)}
        exampleHref={exampleHref}
        eager={eager}
        typesets={/-prose\b/.test(language)}
        previewLayout={previewLayout}
      />
    )
  }

  return (
    <div
      data-not-prose
      className={
        className ??
        `relative ${BLOCK_SPACING} min-w-0 rounded-lg emphasis-sunken`
      }
    >
      <CodePanel
        code={code}
        showCopy={showCopy}
        expanded={expanded}
        onExpandedChange={setExpanded}
      >
        <HighlightedCode
          code={code}
          language={language}
          theme={theme}
          collapsed={canCollapse(code) && !expanded}
        />
      </CodePanel>
    </div>
  )
}
