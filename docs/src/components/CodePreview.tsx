'use client'

import { useState } from 'react'

import Link from 'next/link'

import { Copy } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import { LiveEditor, LiveError, LivePreview, LiveProvider } from 'react-live'

import * as RoadieComponents from '@oztix/roadie-components'
import { useColorMode } from '@oztix/roadie-components/hooks'
import { css } from '@oztix/roadie-core/css'
import * as PandaComponents from '@oztix/roadie-core/jsx'

const scope = {
  css,
  ...RoadieComponents,
  ...PandaComponents,
  Link
}

const { Button, View } = RoadieComponents

const editorStyles = {
  bg: 'neutral.surface.sunken',
  overflow: 'auto',
  fontSize: 'sm',
  p: '200',
  boxShadow: 'sunken',
  borderRadius: 'md',
  border: '1px solid',
  borderColor: 'neutral.border.subtler'
}

// Custom themes that inherit from nightOwl but override the background
const customDarkTheme = {
  ...themes.nightOwl,
  plain: {
    ...themes.nightOwl.plain,
    backgroundColor: 'var(--colors-neutral-surface-sunken)'
  }
}

const customLightTheme = {
  ...themes.nightOwlLight,
  plain: {
    ...themes.nightOwlLight.plain,
    backgroundColor: 'var(--colors-neutral-surface-sunken)'
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
    <div className={css({ position: 'absolute', top: '150', right: '150' })}>
      <Button
        onClick={handleCopy}
        size='sm'
        emphasis='subtler'
        aria-label='Copy code to clipboard'
        px='150'
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
  const colorMode = useColorMode()
  const theme = colorMode === 'dark' ? customDarkTheme : customLightTheme
  const isLive =
    children.startsWith('live') && (language === 'tsx' || language === 'jsx')
  const trimmedCode = isLive
    ? children.replace('live', '').trim()
    : children.trim()

  if (!isLive) {
    return (
      <View mb='800'>
        <CopyButton code={trimmedCode} />
        <Highlight code={trimmedCode} language={language} theme={theme}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre className={css(editorStyles)} style={style}>
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line, key: i })

                const { key, ...linePropsWithoutKey } = lineProps
                return (
                  <div key={i} {...linePropsWithoutKey}>
                    {line.map((token, key) => {
                      const tokenProps = getTokenProps({ token, key })

                      const { key: tokenKey, ...tokenPropsWithoutKey } =
                        tokenProps
                      return <span key={key} {...tokenPropsWithoutKey} />
                    })}
                  </div>
                )
              })}
            </pre>
          )}
        </Highlight>
      </View>
    )
  }
  return (
    <View mb='800'>
      <LiveProvider
        code={trimmedCode}
        scope={scope}
        theme={theme}
        language={language.replace('-live', '')}
      >
        <LivePreview
          className={css({
            px: 300,
            py: 300,
            bg: 'neutral.surface',
            borderTopRadius: 'md',
            fontFamily: 'ui',
            border: '1px solid',
            borderColor: 'neutral.border.subtler',
            borderBottom: 'none',
            overflow: 'hidden',
            overflowX: 'auto'
          })}
        />
        <LiveError />
        <View>
          <CopyButton code={trimmedCode} />
          <LiveEditor
            className={css({
              ...editorStyles,
              borderTopRadius: '0',
              borderTop: 'none'
            })}
          />
        </View>
      </LiveProvider>
    </View>
  )
}
