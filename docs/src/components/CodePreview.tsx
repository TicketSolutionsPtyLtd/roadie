'use client'

import { useEffect, useState } from 'react'

import { Copy } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import { LiveEditor, LiveError, LivePreview, LiveProvider } from 'react-live'

import * as RoadieComponents from '@oztix/roadie-components'
import { css } from '@oztix/roadie-core/css'
import * as PandaComponents from '@oztix/roadie-core/jsx'

const scope = {
  css,
  ...RoadieComponents,
  ...PandaComponents
}

const { Button, View } = RoadieComponents

const editorStyles = {
  bg: 'bg.sunken',
  overflow: 'auto',
  fontSize: 'md',
  p: '200',
  boxShadow: 'sunken',
  borderRadius: '100',
  border: '1px solid',
  borderColor: 'border.subtlest'
}

// Custom themes that inherit from nightOwl but override the background
const customDarkTheme = {
  ...themes.nightOwl,
  plain: {
    ...themes.nightOwl.plain,
    backgroundColor: 'var(--colors-bg-sunken)'
  }
}

const customLightTheme = {
  ...themes.nightOwlLight,
  plain: {
    ...themes.nightOwlLight.plain,
    backgroundColor: 'var(--colors-bg-sunken)'
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
      <Button onPress={handleCopy} size='sm' appearance='ghost' className={css({ gap: '050' })}>
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
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Initial check
    setIsDark(document.documentElement.classList.contains('dark'))

    // Set up observer for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'))
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  const theme = isDark ? customDarkTheme : customLightTheme
  const isLive = children.startsWith('live') && (language === 'tsx' || language === 'jsx')
  const trimmedCode = isLive ? children.replace('live', '').trim() : children.trim()

  if (!isLive) {
    return (
      <View mb='800'>
        <CopyButton code={trimmedCode} />
        <Highlight code={trimmedCode} language={language} theme={theme}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre className={css(editorStyles)} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line, key: i })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </div>
              ))}
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
            bg: 'bg.subtlest',
            borderTopRadius: '100',
            fontFamily: 'ui',
            border: '1px solid',
            borderColor: 'border.subtlest',
            borderBottom: 'none'
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
