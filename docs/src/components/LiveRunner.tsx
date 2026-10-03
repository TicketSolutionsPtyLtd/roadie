'use client'

import {
  use,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import Link from 'next/link'

import {
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

import { getAssetPath } from '@/utils/getAssetPath'

import * as RoadieCharts from '@oztix/roadie-charts'
import { lineChartTable } from '@oztix/roadie-charts/tables'
import * as RoadieComponents from '@oztix/roadie-components'
import * as SpotIllustrations from '@oztix/roadie-components/spot-illustrations'
import {
  plainDateOf,
  resolveComparison,
  viewerTimeZone
} from '@oztix/roadie-core/datetime'
import { recordFields, toSearchParams } from '@oztix/roadie-core/records'
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

// Bare-name keys so MDX live examples can use `<CheckCircle />` etc.
const PhosphorIcons = {
  BellRinging: BellRingingIcon,
  CheckCircle: CheckCircleIcon,
  Check: CheckIcon,
  LinkSimple: LinkSimpleIcon,
  X: XIcon,
  XCircle: XCircleIcon,
  Info: InfoIcon,
  Warning: WarningIcon,
  Star: StarIcon,
  Ticket: TicketIcon,
  Plus: PlusIcon,
  Minus: MinusIcon,
  CaretDown: CaretDownIcon,
  CaretUp: CaretUpIcon,
  CaretLeft: CaretLeftIcon,
  CaretRight: CaretRightIcon,
  ArrowRight: ArrowRightIcon,
  ArrowLeft: ArrowLeftIcon,
  ArrowSquareOut: ArrowSquareOutIcon,
  Heart: HeartIcon,
  MagnifyingGlass: MagnifyingGlassIcon,
  Gear: GearIcon,
  Copy: CopyIcon,
  Trash: TrashIcon,
  PencilSimple: PencilSimpleIcon,
  Eye: EyeIcon,
  EyeSlash: EyeSlashIcon,
  Pause: PauseIcon,
  Play: PlayIcon,
  Envelope: EnvelopeIcon,
  Phone: PhoneIcon,
  ShareNetwork: ShareNetworkIcon,
  ShoppingCart: ShoppingCartIcon,
  DotsThree: DotsThreeIcon,
  SlidersHorizontal: SlidersHorizontalIcon,
  Download: DownloadIcon,
  House: HouseIcon,
  Image: ImageIcon,
  Cube: CubeIcon,
  Export: ExportIcon,
  UserCircle: UserCircleIcon,
  User: UserIcon,
  Buildings: BuildingsIcon,
  Users: UsersIcon,
  Wallet: WalletIcon,
  ListBullets: ListBulletsIcon,
  SquaresFour: SquaresFourIcon,
  TextB: TextBIcon,
  TextItalic: TextItalicIcon,
  TextUnderline: TextUnderlineIcon
}

// Icon-suffixed keys (`<TicketIcon />`) derived from the bare map.
const PhosphorIconsSuffixed = Object.fromEntries(
  Object.entries(PhosphorIcons).map(([name, Icon]) => [`${name}Icon`, Icon])
)

const scope = {
  ...RoadieComponents,
  ...RoadieCharts,
  lineChartTable,
  plainDateOf,
  resolveComparison,
  viewerTimeZone,
  recordFields,
  toSearchParams,
  ...SpotIllustrations,
  ...PhosphorIcons,
  ...PhosphorIconsSuffixed,
  // Widgets + the helpers their live demos need.
  CartDrawer,
  CartContents,
  QueryClient,
  QueryClientProvider,
  createDemoCart,
  DemoRouter,
  getAssetPath,
  Link,
  createPortal,
  use,
  useState,
  useEffect,
  useId
}

const { Button, Dialog, IconButton } = RoadieComponents

function FullWidthPreview() {
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
        <LivePreview className='min-w-0 font-sans whitespace-normal' />
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
  isolated,
  onMounted
}: {
  heightKey: string
  className?: string
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
        <LivePreview className='min-w-0' />
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
  isolated = false
}: LiveRunnerProps) {
  const theme = useCodeTheme()
  const isBleedX = /^(?:tsx|jsx)-live-bleed-x/.test(language)
  const highlightLanguage = highlightLanguageOf(language)
  // A long block stays static until first opened; LiveEditor renders every token.
  const showEditor = editorOpened || !canCollapse(code)

  return (
    <LiveProvider
      code={code}
      scope={scope}
      theme={theme}
      noInline={language.includes('noinline')}
      language={highlightLanguage}
    >
      {expandable && !isolated && (
        <div className='flex justify-end border-b border-subtle bg-normal p-2 max-md:hidden'>
          <FullWidthPreview />
        </div>
      )}
      <Preview
        heightKey={isolated ? `${heightKey}#isolated` : heightKey}
        isolated={isolated}
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
      <LiveError className='bg-subtler px-4 py-3 text-sm text-subtle intent-danger' />
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
