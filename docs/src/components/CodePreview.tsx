'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  CaretUp,
  CheckCircle,
  Copy,
  Eye,
  EyeSlash,
  Gear,
  Heart,
  Info,
  MagnifyingGlass,
  Minus,
  PencilSimple,
  Plus,
  Star,
  Trash,
  Warning,
  XCircle
} from '@phosphor-icons/react'
import { Highlight, themes } from 'prism-react-renderer'
import { LiveEditor, LiveError, LivePreview, LiveProvider } from 'react-live'

import * as RoadieComponents from '@oztix/roadie-components'
import * as SpotIllustrations from '@oztix/roadie-components/spot-illustrations'

const PhosphorIcons = {
  CheckCircle,
  XCircle,
  Info,
  Warning,
  Star,
  Plus,
  Minus,
  CaretDown,
  CaretUp,
  ArrowRight,
  ArrowLeft,
  Heart,
  MagnifyingGlass,
  Gear,
  Trash,
  PencilSimple,
  Eye,
  EyeSlash
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
        emphasis='default'
        aria-label='Copy code to clipboard'
      >
        {copied && 'Copied!'}
        <Copy size={16} weight='bold' />
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
  const isLiveLang = language === 'tsx-live' || language === 'jsx-live'
  const isLivePrefix =
    children.startsWith('live') && (language === 'tsx' || language === 'jsx')
  const isLive = isLiveLang || isLivePrefix
  const trimmedCode = isLivePrefix
    ? children.replace('live', '').trim()
    : children.trim()

  if (!isLive) {
    return (
      <div
        className={
          className ?? 'relative mb-8 min-w-0 rounded-lg emphasis-sunken'
        }
      >
        {showCopy && <CopyButton code={trimmedCode} />}
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
      </div>
    )
  }

  return (
    <div className='relative mb-8 min-w-0 overflow-hidden rounded-xl border border-subtle'>
      <LiveProvider
        code={trimmedCode}
        scope={scope}
        theme={theme}
        language={language.replace('-live', '')}
      >
        <LivePreview className='min-w-0 overflow-x-auto bg-default px-4 py-4 font-sans sm:px-6 sm:py-6' />
        <LiveError className='bg-subtler px-4 py-3 text-sm text-subtle intent-danger' />
        <div className='relative min-w-0'>
          <CopyButton code={trimmedCode} />
          <LiveEditor className='min-w-0 overflow-x-auto emphasis-sunken p-3 font-mono text-xs sm:p-4 sm:text-sm' />
        </div>
      </LiveProvider>
    </div>
  )
}
