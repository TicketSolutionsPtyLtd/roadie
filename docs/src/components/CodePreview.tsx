'use client'

import { type CSSProperties, useEffect, useState } from 'react'

import Link from 'next/link'

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CheckCircleIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  GearIcon,
  HeartIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PauseIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  WarningIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { Highlight, themes } from 'prism-react-renderer'
import { LiveEditor, LiveError, LivePreview, LiveProvider } from 'react-live'

import * as RoadieComponents from '@oztix/roadie-components'
import * as SpotIllustrations from '@oztix/roadie-components/spot-illustrations'

// Bare-name keys so MDX live examples can use `<CheckCircle />` etc.
const PhosphorIcons = {
  CheckCircle: CheckCircleIcon,
  XCircle: XCircleIcon,
  Info: InfoIcon,
  Warning: WarningIcon,
  Star: StarIcon,
  Plus: PlusIcon,
  Minus: MinusIcon,
  CaretDown: CaretDownIcon,
  CaretUp: CaretUpIcon,
  CaretLeft: CaretLeftIcon,
  CaretRight: CaretRightIcon,
  ArrowRight: ArrowRightIcon,
  ArrowLeft: ArrowLeftIcon,
  Heart: HeartIcon,
  MagnifyingGlass: MagnifyingGlassIcon,
  Gear: GearIcon,
  Trash: TrashIcon,
  PencilSimple: PencilSimpleIcon,
  Eye: EyeIcon,
  EyeSlash: EyeSlashIcon,
  Pause: PauseIcon,
  Play: PlayIcon
}

const scope = {
  ...RoadieComponents,
  ...SpotIllustrations,
  ...PhosphorIcons,
  Link
}

const { Button } = RoadieComponents

const customDarkTheme = {
  ...themes.nightOwl,
  plain: {
    ...themes.nightOwl.plain,
    backgroundColor: 'var(--intent-bg-sunken)'
  }
}

const customLightTheme = {
  ...themes.nightOwlLight,
  plain: {
    ...themes.nightOwlLight.plain,
    backgroundColor: 'var(--intent-bg-sunken)'
  }
}

const MAX_COLLAPSED_LINES = 5
// Approx: 5 lines of font-mono text-sm (line-height ~24px) + 32px vertical
// padding. Enough to show 5 source lines with the bottom line clipped under
// the gradient, hinting that more code exists below.
const COLLAPSED_HEIGHT_PX = 5 * 24 + 32

function ViewCodeShade({
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
        className='is-interactive emphasis-normal absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-medium'
      >
        View code
      </button>
    </>
  )
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='absolute top-2 right-2 z-10'>
      <Button
        onClick={handleCopy}
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

type CodePreviewProps = {
  children: string
  language?: string
  showCopy?: boolean
  className?: string
}

export function CodePreview({
  children,
  language = 'tsx',
  showCopy = true,
  className
}: CodePreviewProps) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading DOM state on mount
    setColorMode(
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    )
    const observer = new MutationObserver(() => {
      setColorMode(
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      )
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    return () => observer.disconnect()
  }, [])

  const theme = colorMode === 'dark' ? customDarkTheme : customLightTheme
  const isBleedX =
    language === 'tsx-live-bleed-x' || language === 'jsx-live-bleed-x'
  const isLiveLang =
    language === 'tsx-live' || language === 'jsx-live' || isBleedX
  const isLivePrefix =
    children.startsWith('live') && (language === 'tsx' || language === 'jsx')
  const isLive = isLiveLang || isLivePrefix
  const trimmedCode = isLivePrefix
    ? children.replace('live', '').trim()
    : children.trim()

  const lineCount = trimmedCode.split('\n').length
  const canCollapse = lineCount > MAX_COLLAPSED_LINES
  const [isExpanded, setIsExpanded] = useState(false)
  const isCollapsed = canCollapse && !isExpanded

  const collapseStyle: CSSProperties | undefined = isCollapsed
    ? { maxHeight: `${COLLAPSED_HEIGHT_PX}px`, overflow: 'hidden' }
    : undefined

  if (!isLive) {
    return (
      <div
        className={
          className ?? 'relative mb-8 min-w-0 rounded-lg emphasis-sunken'
        }
      >
        {showCopy && <CopyButton code={trimmedCode} />}
        <div className='relative' style={collapseStyle}>
          <Highlight code={trimmedCode} language={language} theme={theme}>
            {({ tokens, getLineProps, getTokenProps }) => (
              <pre
                className='min-w-0 overflow-x-auto p-3 font-mono text-xs sm:p-4 sm:text-sm'
                style={{ scrollbarWidth: 'none' }}
              >
                {tokens.map((line, i) => {
                  const { key: _key, ...linePropsWithoutKey } = getLineProps({
                    line,
                    key: i
                  })
                  return (
                    <div key={i} {...linePropsWithoutKey}>
                      {line.map((token, key) => {
                        const { key: _tokenKey, ...tokenPropsWithoutKey } =
                          getTokenProps({ token, key })
                        return <span key={key} {...tokenPropsWithoutKey} />
                      })}
                    </div>
                  )
                })}
              </pre>
            )}
          </Highlight>
          {isCollapsed && (
            <ViewCodeShade
              expanded={false}
              onToggle={() => setIsExpanded(true)}
            />
          )}
        </div>
        {canCollapse && isExpanded && (
          <ViewCodeShade
            expanded
            onToggle={() => setIsExpanded(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className='relative mb-8 min-w-0 overflow-hidden rounded-xl border border-subtle'>
      <LiveProvider
        code={trimmedCode}
        scope={scope}
        theme={theme}
        language={language.replace(/-live(-bleed-x)?/, '')}
      >
        <LivePreview
          className={`min-w-0 overflow-x-auto bg-normal font-sans ${isBleedX ? 'py-4 sm:py-6' : 'px-4 py-4 sm:px-6 sm:py-6'}`}
        />
        <LiveError className='bg-subtler px-4 py-3 text-sm text-subtle intent-danger' />
        <div className='relative min-w-0' style={collapseStyle}>
          <CopyButton code={trimmedCode} />
          <LiveEditor className='min-w-0 overflow-x-auto emphasis-sunken p-3 font-mono text-xs sm:p-4 sm:text-sm' />
          {isCollapsed && (
            <ViewCodeShade
              expanded={false}
              onToggle={() => setIsExpanded(true)}
            />
          )}
        </div>
        {canCollapse && isExpanded && (
          <ViewCodeShade
            expanded
            onToggle={() => setIsExpanded(false)}
          />
        )}
      </LiveProvider>
    </div>
  )
}
