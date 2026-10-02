'use client'

import { Suspense, lazy, useState } from 'react'

import { ArrowsOutIcon } from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components/button'
import { Skeleton } from '@oztix/roadie-components/skeleton'

import {
  CodePanel,
  HighlightedCode,
  canCollapse,
  highlightLanguageOf,
  useCodeTheme
} from './codeChrome'
import {
  DEFAULT_PREVIEW_HEIGHT,
  exampleHeights,
  useNearViewport
} from './nearViewport'

// react-live and the example scope (every component, chart and widget) load
// with the first example that nears the viewport, not with the page.
const loadLiveRunner = () => import('./LiveRunner')
const LiveRunner = lazy(loadLiveRunner)

type CodePreviewProps = {
  children: string
  language?: string
  showCopy?: boolean
  className?: string
  /** Adds a button that opens the live example in a full-width dialog. A `-expand` fence suffix does the same. */
  expandable?: boolean
  /** The example's own page; adds an action that opens it in a new tab. */
  exampleHref?: string
  /** Renders the live example on load instead of when it nears the viewport. An `eager` fence meta does the same. */
  eager?: boolean
}

/** What a live example shows until it renders: a reserved preview and its static code. */
function LivePlaceholder({
  code,
  language,
  heightKey,
  exampleHref,
  expandable,
  expanded,
  onExpandedChange
}: {
  code: string
  language: string
  heightKey: string
  exampleHref?: string
  expandable: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}) {
  const theme = useCodeTheme()
  const highlightLanguage = highlightLanguageOf(language)
  return (
    <>
      {expandable && (
        <div className='flex justify-end border-b border-subtle bg-normal p-2 max-md:hidden'>
          <Button size='sm' emphasis='subtler' disabled>
            <ArrowsOutIcon weight='bold' className='size-4' />
            Full width
          </Button>
        </div>
      )}
      <div
        data-live-example='pending'
        className='grid bg-normal p-4 sm:p-6'
        style={{
          minHeight: exampleHeights.get(heightKey) ?? DEFAULT_PREVIEW_HEIGHT
        }}
      >
        <Skeleton shape='block' emphasis='subtler' className='h-full' />
      </div>
      <CodePanel
        code={code}
        exampleHref={exampleHref}
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
  eager
}: {
  code: string
  language: string
  expandable: boolean
  exampleHref?: string
  eager: boolean
}) {
  const [ref, near, onMounted] = useNearViewport<HTMLDivElement>(
    eager,
    loadLiveRunner
  )
  const [expanded, setExpanded] = useState(false)
  const [editorOpened, setEditorOpened] = useState(false)
  const heightKey = exampleHref ?? `${code.length}:${code.slice(0, 120)}`
  const shared = {
    code,
    language,
    heightKey,
    exampleHref,
    expandable,
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
      className='relative mb-8 min-w-0 overflow-hidden rounded-xl border border-subtle'
    >
      {near ? (
        <Suspense fallback={placeholder}>
          <LiveRunner
            {...shared}
            editorOpened={editorOpened}
            onMounted={onMounted}
          />
        </Suspense>
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
  eager = false
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
      />
    )
  }

  return (
    <div
      className={
        className ?? 'relative mb-8 min-w-0 rounded-lg emphasis-sunken'
      }
    >
      <CodePanel
        code={code}
        showActions={showCopy}
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
