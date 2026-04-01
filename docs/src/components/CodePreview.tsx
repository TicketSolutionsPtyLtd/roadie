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
    backgroundColor: 'var(--intent-surface-sunken)'
  }
}

const customLightTheme = {
  ...themes.nightOwlLight,
  plain: {
    ...themes.nightOwlLight.plain,
    backgroundColor: 'var(--intent-surface-sunken)'
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
        emphasis='subtler'
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
  language: string
}

export function CodePreview({ children, language = 'tsx' }: CodePreviewProps) {
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
      <div className='mb-8 relative min-w-0'>
        <CopyButton code={trimmedCode} />
        <Highlight code={trimmedCode} language={language} theme={theme}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className='emphasis-sunken overflow-x-auto text-xs sm:text-sm p-3 sm:p-4 rounded-md min-w-0'
              style={style}
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
    <div className='mb-8 relative min-w-0 emphasis-subtle-border rounded-md overflow-hidden'>
      <LiveProvider
        code={trimmedCode}
        scope={scope}
        theme={theme}
        language={language.replace('-live', '')}
      >
        <LivePreview className='px-4 py-4 sm:px-6 sm:py-6 emphasis-default-surface font-sans overflow-x-auto min-w-0' />
        <LiveError className='px-4 py-3 text-sm intent-danger emphasis-subtle-fg emphasis-subtler-surface' />
        <div className='relative min-w-0'>
          <CopyButton code={trimmedCode} />
          <LiveEditor className='emphasis-sunken overflow-x-auto text-xs sm:text-sm p-3 sm:p-4 min-w-0' />
        </div>
      </LiveProvider>
    </div>
  )
}
