'use client'

import {
  Children,
  type ReactNode,
  use,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  ArrowsOutIcon,
  BellRingingIcon,
  BuildingsIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  CubeIcon,
  DotsThreeIcon,
  DownloadIcon,
  EnvelopeIcon,
  ExportIcon,
  EyeIcon,
  EyeSlashIcon,
  GearIcon,
  HeartIcon,
  HouseIcon,
  ImageIcon,
  InfoIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PauseIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlayIcon,
  PlusIcon,
  ShareNetworkIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
  StarIcon,
  TableIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TicketIcon,
  TrashIcon,
  UserCircleIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  WarningIcon,
  XCircleIcon,
  XIcon
} from '@phosphor-icons/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import {
  LiveContext,
  LiveEditor,
  LiveError,
  LivePreview,
  LiveProvider
} from 'react-live'

import { toPreviewCode, withBasePath } from '@/lib/fence-layout.mjs'

import * as RoadieCharts from '@oztix/roadie-charts'
import { LegendKey } from '@oztix/roadie-charts/chart-legend'
import { lineChartTable } from '@oztix/roadie-charts/tables'
import * as RoadieComponents from '@oztix/roadie-components'
import * as SpotIllustrations from '@oztix/roadie-components/spot-illustrations'
import {
  addDays,
  plainDateOf,
  resolveComparison,
  viewerTimeZone
} from '@oztix/roadie-core/datetime'
import {
  compileRecordQuery,
  recordFields,
  recordViewToSearchParams,
  recordsToCsv,
  resolveRecordQuery,
  sortRecords,
  toRecordsRequest
} from '@oztix/roadie-core/records'
import { toMeilisearch } from '@oztix/roadie-core/records/meilisearch'
import { Editor, useEditorContext } from '@oztix/roadie-editor/editor'
import {
  Node,
  NodeViewWrapper,
  mergeAttributes,
  reactNodeView
} from '@oztix/roadie-editor/extensions'
import { renderEditorValue } from '@oztix/roadie-editor/render'
import { CartContents } from '@oztix/roadie-widgets/cart-contents/react'
import { CartDrawer } from '@oztix/roadie-widgets/cart-drawer/react'

import { DemoRouter } from './DemoRouter'
import { createDemoCart } from './cartDrawerDemo'
import {
  CodePanel,
  HighlightedCode,
  canCollapse,
  highlightLanguageOf,
  useCodeTheme
} from './codeChrome'
import { DEFAULT_PREVIEW_HEIGHT, exampleHeights } from './nearViewport'

// Live examples use the Icon-suffixed names, as consumer code imports them.
const PhosphorIcons = {
  BellRingingIcon,
  CheckCircleIcon,
  CheckIcon,
  LinkSimpleIcon,
  XIcon,
  XCircleIcon,
  InfoIcon,
  WarningIcon,
  StarIcon,
  TicketIcon,
  PlusIcon,
  MinusIcon,
  CaretDownIcon,
  CaretUpIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  GearIcon,
  CopyIcon,
  TrashIcon,
  PencilSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  PauseIcon,
  PlayIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShareNetworkIcon,
  ShoppingCartIcon,
  DotsThreeIcon,
  SlidersHorizontalIcon,
  DownloadIcon,
  HouseIcon,
  CubeIcon,
  ExportIcon,
  UserCircleIcon,
  UserIcon,
  BuildingsIcon,
  UsersIcon,
  WalletIcon,
  ListBulletsIcon,
  SquaresFourIcon,
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  ArrowCounterClockwiseIcon,
  ArrowClockwiseIcon,
  ImageIcon,
  TableIcon
}

/**
 * A captioned cell, opened by a caption comment in a fence with `layout=`.
 * Several elements under one caption wrap in a row. A lone element sits in a
 * block, so a block such as Accordion fills the cell and an inline one such as
 * Button or Kbd keeps its own width.
 */
function PreviewCell({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className='grid content-start gap-1 self-start'>
      <p data-not-prose className='text-sm text-subtle'>
        {label}
      </p>
      {Children.count(children) > 1 ? (
        <div className='flex flex-wrap items-center gap-2'>{children}</div>
      ) : (
        // Top alignment drops the line's descender space under an inline-block such as a textarea.
        <div className='*:align-top'>{children}</div>
      )}
    </div>
  )
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const scope = {
  ...RoadieComponents,
  ...RoadieCharts,
  Editor,
  useEditorContext,
  renderEditorValue,
  Node,
  NodeViewWrapper,
  mergeAttributes,
  reactNodeView,
  LegendKey,
  lineChartTable,
  addDays,
  plainDateOf,
  resolveComparison,
  viewerTimeZone,
  recordFields,
  recordsToCsv,
  recordViewToSearchParams,
  compileRecordQuery,
  resolveRecordQuery,
  sortRecords,
  toRecordsRequest,
  toMeilisearch,
  ...SpotIllustrations,
  ...PhosphorIcons,
  // Widgets + the helpers their live demos need.
  CartDrawer,
  CartContents,
  QueryClient,
  QueryClientProvider,
  createDemoCart,
  DemoRouter,
  createPortal,
  use,
  useState,
  useEffect,
  useId,
  PreviewCell
}

const { Button, Dialog, IconButton } = RoadieComponents

function FullWidthPreview({ previewLayout }: { previewLayout?: string }) {
  return (
    <Dialog>
      <Dialog.Trigger
        render={
          <Button size='sm' emphasis='subtler'>
            <ArrowsOutIcon weight='bold' className='size-4' />
            Full width
          </Button>
        }
      />
      <Dialog.Content className='max-w-none gap-4 p-4'>
        <div className='flex items-center justify-between gap-4'>
          <Dialog.Title className='text-display-ui-6'>
            Full-width example
          </Dialog.Title>
          <Dialog.Close
            render={
              <IconButton aria-label='Close' size='sm' emphasis='subtler'>
                <XIcon weight='bold' className='size-4' />
              </IconButton>
            }
          />
        </div>
        <LivePreview
          className={`min-w-0 font-sans whitespace-normal ${previewLayout ?? ''}`}
        />
      </Dialog.Content>
    </Dialog>
  )
}

/**
 * Renders the example at transition priority, so React can yield to scrolling
 * while a heavy one mounts. Holds the placeholder's height until it lands,
 * then remembers the real one.
 */
function Preview({
  heightKey,
  className,
  previewLayout,
  isolated,
  onMounted
}: {
  heightKey: string
  className?: string
  previewLayout?: string
  isolated: boolean
  onMounted?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const live = useContext(LiveContext)
  const element = useDeferredValue(live.element)
  const settled = element != null || live.error != null

  useLayoutEffect(() => {
    const frame = ref.current
    if (!frame || !settled) return
    const observer = new ResizeObserver(() => {
      exampleHeights.set(heightKey, frame.offsetHeight)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [heightKey, settled])

  useEffect(() => {
    if (settled) onMounted?.()
  }, [settled, onMounted])

  const reserved = exampleHeights.get(heightKey) ?? DEFAULT_PREVIEW_HEIGHT

  return (
    <div
      ref={ref}
      data-live-example='rendered'
      className={className}
      style={
        !settled
          ? { minHeight: reserved }
          : isolated
            ? undefined
            : // Off screen, a mounted example skips style and layout at its last size.
              {
                contentVisibility: 'auto',
                containIntrinsicBlockSize: `auto ${reserved}px`
              }
      }
    >
      <LiveContext.Provider value={{ ...live, element }}>
        <LivePreview className={`min-w-0 ${previewLayout ?? ''}`} />
      </LiveContext.Provider>
    </div>
  )
}

export type LiveRunnerProps = {
  code: string
  /** The fence language, such as `tsx-live-noinline-expand`. */
  language: string
  heightKey: string
  exampleHref?: string
  expandable?: boolean
  /** Owned by `CodePreview`, so it survives the swap from the placeholder. */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /** Once opened, the editor stays mounted so collapsing keeps edits. */
  editorOpened?: boolean
  /** Called once the first render commits, to free the mount queue. */
  onMounted?: () => void
  /** Only the preview, for the example's own page. */
  isolated?: boolean
  /** Classes the preview lays the example out with, from the fence's `layout=`, `gap=`, and `width=`. */
  previewLayout?: string
}

export default function LiveRunner({
  code,
  language,
  heightKey,
  exampleHref,
  expandable = false,
  expanded = false,
  onExpandedChange = () => {},
  editorOpened = false,
  onMounted,
  isolated = false,
  previewLayout
}: LiveRunnerProps) {
  const theme = useCodeTheme()
  const isBleedX = /^(?:tsx|jsx)-live-bleed-x/.test(language)
  const highlightLanguage = highlightLanguageOf(language)
  // A long block stays static until first opened; LiveEditor renders every token.
  const showEditor = editorOpened || !canCollapse(code)
  const noInline = language.includes('noinline')
  // The editor and the code panel keep the fence's own code; only what runs changes.
  const transformCode = (source: string) =>
    withBasePath(
      previewLayout && !noInline ? toPreviewCode(source) : source,
      BASE_PATH
    )

  return (
    <LiveProvider
      code={code}
      scope={scope}
      theme={theme}
      noInline={noInline}
      language={highlightLanguage}
      transformCode={transformCode}
    >
      {expandable && !isolated && (
        <div
          data-not-prose
          className='flex justify-end border-b border-subtle bg-normal p-2 max-md:hidden'
        >
          <FullWidthPreview previewLayout={previewLayout} />
        </div>
      )}
      <Preview
        heightKey={isolated ? `${heightKey}#isolated` : heightKey}
        isolated={isolated}
        previewLayout={previewLayout}
        onMounted={onMounted}
        className={
          isolated
            ? 'min-w-0 font-sans whitespace-normal'
            : // whitespace-normal resets the `white-space: pre` inherited from the MDX
              // fence wrapper. overflow-y-hidden stops a sub-pixel vertical overflow
              // flickering a scrollbar under animated examples, since a non-visible
              // overflow-x forces the other axis to auto.
              `min-w-0 overflow-x-auto overflow-y-hidden bg-normal font-sans whitespace-normal ${isBleedX ? 'py-4 sm:py-6' : 'px-4 py-4 sm:px-6 sm:py-6'}`
        }
      />
      <LiveError
        data-not-prose
        className='bg-subtler px-4 py-3 text-sm text-subtle intent-danger'
      />
      {!isolated && (
        <CodePanel
          code={code}
          exampleHref={exampleHref}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
        >
          {showEditor ? (
            <LiveEditor className='min-w-0 overflow-x-auto emphasis-sunken p-3 font-mono text-xs sm:p-4 sm:text-sm' />
          ) : (
            <div className='emphasis-sunken'>
              <HighlightedCode
                code={code}
                language={highlightLanguage}
                theme={theme}
                collapsed
              />
            </div>
          )}
        </CodePanel>
      )}
    </LiveProvider>
  )
}
