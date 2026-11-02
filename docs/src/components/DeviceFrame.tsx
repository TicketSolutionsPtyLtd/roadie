'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { getAssetPath } from '@/utils/getAssetPath'

import {
  type Device,
  FRAME_PATH,
  type FrameExample,
  type FrameRoot,
  deviceWidth,
  fitScale,
  frameMessageFrom,
  postToFrame,
  readFrameRoot
} from './exampleDevices'

// Tall enough for a menu or dialog an example opens to show inside the frame.
const MIN_FRAME_HEIGHT = 320

function subscribeToRoot(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style']
  })
  // The accent lives in a style tag ThemeProvider rewrites.
  observer.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true
  })
  return () => observer.disconnect()
}

const readRoot = () => JSON.stringify(readFrameRoot())
const serverRoot = () =>
  JSON.stringify({ className: '', colorScheme: '', accent: '' })

/**
 * An example in an iframe at a device's width, so viewport breakpoints respond
 * as well as container queries. Shrinks to fit when the device is wider than
 * the space it has.
 */
export function DeviceFrame({
  device,
  example
}: {
  device: Device
  example: Omit<FrameExample, 'root'>
}) {
  const width = deviceWidth(device)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  // Counts the frame's ready messages, so a frame that reloads gets the example again.
  const [readyCount, setReadyCount] = useState(0)
  const [height, setHeight] = useState(MIN_FRAME_HEIGHT)
  const [scale, setScale] = useState(1)
  const rootKey = useSyncExternalStore(subscribeToRoot, readRoot, serverRoot)
  const { code, language, previewLayout } = example

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = frameMessageFrom(event, frameRef.current?.contentWindow)
      if (message?.type === 'roadie-example-ready')
        setReadyCount((count) => count + 1)
      if (message?.type === 'roadie-example-height')
        setHeight(Math.max(MIN_FRAME_HEIGHT, message.height))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const target = frameRef.current?.contentWindow
    if (readyCount === 0 || !target) return
    postToFrame(target, {
      type: 'roadie-example',
      example: {
        code,
        language,
        previewLayout,
        root: JSON.parse(rootKey) as FrameRoot
      }
    })
  }, [readyCount, code, language, previewLayout, rootKey])

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(() =>
      setScale(fitScale(width, box.clientWidth))
    )
    observer.observe(box)
    return () => observer.disconnect()
  }, [width])

  return (
    // The outer box clips the unscaled frame's layout width, so the padding leaves room for its shadow.
    <div className='overflow-hidden bg-sunken p-4 sm:p-6'>
      <div ref={boxRef} className='relative' style={{ height: height * scale }}>
        <iframe
          ref={frameRef}
          title={`Example at ${device} width`}
          src={getAssetPath(FRAME_PATH)}
          className='absolute top-0 left-1/2 origin-top rounded-lg shadow-md'
          style={{
            width,
            height,
            transform: `translateX(-50%) scale(${scale})`
          }}
        />
      </div>
    </div>
  )
}
