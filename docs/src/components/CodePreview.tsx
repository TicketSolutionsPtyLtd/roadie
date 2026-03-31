'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import { Copy } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import { LiveEditor, LiveError, LivePreview, LiveProvider } from 'react-live'

import * as RoadieComponents from '@oztix/roadie-components'

const scope = {
  ...RoadieComponents,
  Link,
}

const { Button } = RoadieComponents

const customDarkTheme = {
  ...themes.nightOwl,
  plain: {
    ...themes.nightOwl.plain,
    backgroundColor: 'var(--color-neutral-2)',
  },
}

const customLightTheme = {
  ...themes.nightOwlLight,
  plain: {
    ...themes.nightOwlLight.plain,
    backgroundColor: 'var(--color-neutral-2)',
  },
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="absolute top-2 right-2 z-10">
      <Button
        onClick={handleCopy}
        size="sm"
        emphasis="subtler"
        aria-label="Copy code to clipboard"
      >
        {copied && 'Copied!'}
        <Copy size={16} />
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
      attributeFilter: ['class'],
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
      <div className="mb-8 relative min-w-0">
        <CopyButton code={trimmedCode} />
        <Highlight code={trimmedCode} language={language} theme={theme}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className="bg-neutral-2 overflow-x-auto text-xs sm:text-sm p-3 sm:p-4 rounded-md border border-neutral-6 min-w-0"
              style={style}
            >
              {tokens.map((line, i) => {
                const { key: _key, ...linePropsWithoutKey } = getLineProps({
                  line,
                  key: i,
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
    <div className="mb-8 relative min-w-0">
      <LiveProvider
        code={trimmedCode}
        scope={scope}
        theme={theme}
        language={language.replace('-live', '')}
      >
        <LivePreview className="px-4 py-4 sm:px-6 sm:py-6 bg-neutral-1 rounded-t-md font-sans border border-neutral-6 border-b-0 overflow-x-auto min-w-0" />
        <LiveError className="px-4 py-3 text-sm text-danger-11 bg-danger-2 border-x border-neutral-6" />
        <div className="relative min-w-0">
          <CopyButton code={trimmedCode} />
          <LiveEditor className="bg-neutral-2 overflow-x-auto text-xs sm:text-sm p-3 sm:p-4 rounded-b-md border border-neutral-6 border-t-0 min-w-0" />
        </div>
      </LiveProvider>
    </div>
  )
}
