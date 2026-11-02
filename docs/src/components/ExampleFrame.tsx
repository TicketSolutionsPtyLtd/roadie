'use client'

import { useEffect, useRef, useState } from 'react'

import { LazyLiveRunner } from './LazyLiveRunner'
import { previewSpacing } from './codeChrome'
import {
  type FrameExample,
  applyFrameRoot,
  frameMessageFrom,
  postToFrame
} from './exampleDevices'

/** The page inside a `DeviceFrame`: runs the example the docs page posts, and reports its height. */
export function ExampleFrame() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [example, setExample] = useState<FrameExample>()

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = frameMessageFrom(event, window.parent)
      if (message?.type !== 'roadie-example') return
      applyFrameRoot(message.example.root)
      setExample(message.example)
    }
    window.addEventListener('message', onMessage)
    postToFrame(window.parent, { type: 'roadie-example-ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const observer = new ResizeObserver(() =>
      postToFrame(window.parent, {
        type: 'roadie-example-height',
        height: content.offsetHeight
      })
    )
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  return (
    <div className='min-h-dvh bg-normal'>
      <div
        ref={contentRef}
        className={example ? previewSpacing(example.language) : undefined}
      >
        {example && (
          <LazyLiveRunner
            loading={null}
            code={example.code}
            language={example.language}
            heightKey='frame'
            previewLayout={example.previewLayout}
            isolated
          />
        )}
      </div>
    </div>
  )
}
