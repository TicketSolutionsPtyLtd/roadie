import { ChartPatterns } from '@oztix/roadie-charts/chart-patterns'

import { ComponentSkeleton, Skel } from './ComponentSkeleton'

const SALES = ['h-4', 'h-6', 'h-5', 'h-8', 'h-10']

const HEAT = [
  'bg-chart-heat-0',
  'bg-chart-heat-1',
  'bg-chart-heat-2',
  'bg-chart-heat-3',
  'bg-chart-heat-4',
  'bg-chart-heat-5',
  'bg-chart-heat-6',
  'bg-chart-heat-7',
  'bg-chart-heat-8'
]

const TREND = '0,14 8,12 16,13 24,8 32,9 40,4 48,2'

function Spark({ className }: { className?: string }) {
  return (
    <svg
      viewBox='-2 0 52 16'
      className={`h-4 w-12 overflow-visible ${className ?? ''}`}
    >
      <polyline
        points={TREND}
        fill='none'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
        className='stroke-chart-highlight'
      />
      <circle cx={48} cy={2} r={2.5} className='fill-chart-highlight' />
    </svg>
  )
}

function MeterBar({ className }: { className?: string }) {
  return (
    <div
      className={`relative h-1.5 rounded-full bg-chart-context ${className ?? ''}`}
    >
      <div className='h-full w-3/5 rounded-full bg-chart-highlight' />
      <div className='absolute -inset-y-1 left-4/5 w-0.5 rounded-full bg-chart-value' />
    </div>
  )
}

function Tile({ children }: { children?: React.ReactNode }) {
  return (
    <div className='grid emphasis-raised content-start gap-1.5 rounded-md p-2'>
      <Skel className='h-1.5 w-8' />
      {children ?? <Skel className='h-2.5 w-10 bg-strong/30' />}
    </div>
  )
}

/** A charts page's preview art, authored at roughly `w-40` for `PreviewThumbnail`. */
export function ChartPreview({ name }: { name: string }) {
  switch (name) {
    case 'data-visualisation':
      return (
        <div className='relative flex h-16 w-40 items-end gap-1.5'>
          {SALES.map((height) => (
            <div
              key={height}
              className={`flex-1 rounded-t-sm bg-chart-context ${height}`}
            />
          ))}
          <div className='h-14 flex-1 rounded-t-sm bg-chart-highlight' />
          <div className='absolute inset-x-0 top-1 border-t-2 border-dashed border-chart-value' />
        </div>
      )
    case 'dashboards':
      return (
        <div className='grid w-40 grid-cols-3 gap-1.5'>
          <Tile />
          <Tile />
          <Tile />
          <div className='col-span-2 grid emphasis-raised gap-1.5 rounded-md p-2'>
            <Skel className='h-1.5 w-12' />
            <Spark className='w-full' />
          </div>
          <Tile>
            <MeterBar />
          </Tile>
        </div>
      )
    case 'dashboard':
      return (
        <div className='grid w-40 grid-cols-4 gap-1.5'>
          {['col-span-1', 'col-span-1', 'col-span-2', 'col-span-2 h-10'].map(
            (span, index) => (
              <div
                key={index}
                className={`h-6 rounded-md border-2 border-dashed border-normal ${span}`}
              />
            )
          )}
          <div className='col-span-2 h-10 rounded-md bg-strong/15' />
        </div>
      )
    case 'data-card':
      return (
        <div className='grid w-36 emphasis-raised gap-2 rounded-lg p-3'>
          <Skel className='h-2 w-16' />
          <p className='text-lg/none font-semibold text-strong'>2,480</p>
          <Skel className='h-1.5 w-full' />
          <Skel className='h-1.5 w-20' />
        </div>
      )
    case 'stat-tile':
      return (
        <div className='grid w-36 emphasis-raised gap-2 rounded-lg p-3'>
          <Skel className='h-2 w-16' />
          <div className='flex items-end justify-between gap-2'>
            <p className='text-lg/none font-semibold text-strong'>8,412</p>
            <Spark />
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='rounded-full emphasis-subtle px-1.5 text-[0.625rem] font-semibold intent-success'>
              +12%
            </span>
            <Skel className='h-1.5 w-12' />
          </div>
        </div>
      )
    case 'meter':
      return (
        <div className='grid w-36 gap-2'>
          <div className='flex items-center justify-between'>
            <Skel className='h-2 w-14' />
            <p className='text-xs font-semibold text-strong'>60%</p>
          </div>
          <MeterBar className='h-2' />
        </div>
      )
    case 'sparkline':
      return <Spark className='h-12 w-36' />
    case 'data-table':
      return (
        <div className='grid w-40 emphasis-raised divide-y divide-subtler rounded-lg px-2.5'>
          {['w-12', 'w-9', 'w-11'].map((width) => (
            <div key={width} className='flex items-center gap-2 py-2'>
              <Skel className={`h-1.5 ${width}`} />
              <Spark className='ms-auto h-3 w-8' />
              <MeterBar className='w-8' />
            </div>
          ))}
        </div>
      )
    case 'line-chart':
      return (
        <svg
          viewBox='0 0 160 64'
          className='h-16 w-40 overflow-visible'
          aria-hidden
        >
          <path
            d='M0 50 L40 44 L80 36 L120 26 L160 12 L160 30 L120 40 L80 48 L40 54 L0 58 Z'
            className='fill-chart-band'
          />
          <polyline
            points='0,54 40,49 80,42 120,33 160,21'
            fill='none'
            strokeWidth={1.25}
            strokeDasharray='3 3'
            className='stroke-chart-median'
          />
          <polyline
            points='0,52 40,44 80,34 104,28'
            fill='none'
            strokeWidth={2}
            strokeLinecap='round'
            className='stroke-chart-highlight'
          />
          <polyline
            points='104,28 160,10'
            fill='none'
            strokeWidth={2}
            strokeDasharray='0.5 4'
            strokeLinecap='round'
            className='stroke-chart-highlight'
          />
          <circle cx={104} cy={28} r={3} className='fill-chart-highlight' />
        </svg>
      )
    case 'bar-chart':
      return (
        <div className='flex h-16 w-40 items-end gap-1'>
          {['h-6', 'h-5', 'h-7', 'h-8', 'h-12', 'h-16', 'h-10'].map(
            (height, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-sm ${height} ${i === 5 ? 'bg-chart-highlight' : 'bg-chart-1'}`}
              />
            )
          )}
        </div>
      )
    case 'ranked-bars':
      return (
        <div className='grid w-40 gap-1.5'>
          {['w-full', 'w-3/4', 'w-1/2', 'w-1/3'].map((width, i) => (
            <div
              key={width}
              className={`h-2.5 rounded-r-sm ${width} ${i === 0 ? 'bg-chart-highlight' : 'bg-chart-context'}`}
            />
          ))}
        </div>
      )
    case 'stacked-bars':
      return (
        <div className='grid w-40 gap-1.5'>
          {[
            ['w-7/12', 'w-2/12', 'w-3/12'],
            ['w-8/12', 'w-2/12', 'w-2/12'],
            ['w-5/12', 'w-1/12', 'w-4/12']
          ].map((row, i) => (
            <div key={i} className='flex h-3 gap-px'>
              <div className={`${row[0]} rounded-l-sm bg-chart-trio-1`} />
              <div className={`${row[1]} bg-chart-trio-2`} />
              <div className={`${row[2]} rounded-r-sm bg-chart-trio-3`} />
            </div>
          ))}
        </div>
      )
    case 'histogram':
      return (
        <div className='relative flex h-16 w-40 items-end gap-px'>
          {['h-10', 'h-16', 'h-12', 'h-8', 'h-5', 'h-3', 'h-2', 'h-1'].map(
            (height, i) => (
              <div key={i} className={`flex-1 ${height} bg-chart-1`} />
            )
          )}
          <div className='absolute inset-y-0 left-[22%] border-l-2 border-dashed border-chart-median' />
        </div>
      )
    case 'funnel':
      return (
        <div className='grid w-40 gap-1.5'>
          {['w-full', 'w-1/2', 'w-1/3', 'w-1/5'].map((width) => (
            <div
              key={width}
              className={`h-2.5 rounded-r-sm bg-chart-1 ${width}`}
            />
          ))}
        </div>
      )
    case 'heatmap':
      return (
        <div className='grid w-40 grid-cols-6 gap-0.5'>
          {[1, 2, 3, 5, 3, 2, 1, 2, 4, 7, 5, 2, 2, 3, 5, 8, 6, 3].map(
            (step, i) => (
              <div key={i} className={`h-4 rounded-sm ${HEAT[step]}`} />
            )
          )}
        </div>
      )
    case 'scatter':
      return (
        <div className='relative h-16 w-40'>
          <div className='absolute inset-x-0 top-1/2 border-t border-dashed border-chart-axis' />
          <div className='absolute inset-y-0 left-1/2 border-l border-dashed border-chart-axis' />
          {[
            ['left-[70%] top-[15%]', 'size-3'],
            ['left-[80%] top-[35%]', 'size-2'],
            ['left-[58%] top-[25%]', 'size-2.5'],
            ['left-[35%] top-[30%]', 'size-2'],
            ['left-[62%] top-[60%]', 'size-2']
          ].map(([place, size]) => (
            <div
              key={place}
              className={`absolute rounded-full bg-chart-context ${place} ${size}`}
            />
          ))}
          <div className='absolute top-[70%] left-[22%] size-3 rounded-full bg-chart-highlight' />
        </div>
      )
    case 'small-multiples':
      return (
        <div className='grid w-40 grid-cols-2 gap-2'>
          {[
            ['h-3', 'h-8', 'h-6', 'h-2'],
            ['h-2', 'h-5', 'h-4', 'h-1'],
            ['h-1', 'h-3', 'h-3', 'h-2'],
            ['h-1', 'h-1', 'h-2', 'h-1']
          ].map((bars, i) => (
            <div key={i} className='flex h-8 items-end gap-px'>
              {bars.map((height, j) => (
                <div
                  key={j}
                  className={`flex-1 rounded-t-sm bg-chart-1 ${height}`}
                />
              ))}
            </div>
          ))}
        </div>
      )
    case 'chart':
      return (
        <div className='grid w-40 emphasis-raised gap-2 rounded-lg p-2.5'>
          <Skel className='h-2 w-24' />
          <div className='flex h-10 items-end gap-1 border-b border-chart-axis'>
            {['h-4', 'h-6', 'h-5', 'h-8', 'h-7'].map((height) => (
              <div
                key={height}
                className={`flex-1 rounded-t-xs bg-chart-context ${height}`}
              />
            ))}
            <div className='h-10 flex-1 rounded-t-xs bg-chart-highlight' />
          </div>
          <Skel className='h-1.5 w-14 opacity-60' />
        </div>
      )
    case 'chart-legend':
      return (
        <div className='grid gap-2'>
          <div className='flex items-center gap-2'>
            <div className='size-2.5 rounded-full bg-chart-1' />
            <Skel className='h-2 w-14' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-0.5 w-2.5 rounded-full bg-chart-2' />
            <Skel className='h-2 w-10' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='size-2.5 rounded-xs bg-chart-3' />
            <Skel className='h-2 w-16' />
          </div>
        </div>
      )
    case 'chart-tooltip':
      return (
        <div className='relative h-20 w-40'>
          <svg viewBox='0 0 160 80' className='absolute inset-0'>
            <polyline
              points='0,70 30,62 60,66 90,44 120,50 160,30'
              fill='none'
              strokeWidth={2}
              strokeLinejoin='round'
              className='stroke-chart-highlight'
            />
            <line
              x1={90}
              x2={90}
              y1={0}
              y2={80}
              strokeDasharray='3 3'
              className='stroke-chart-axis'
            />
            <circle cx={90} cy={44} r={3.5} className='fill-chart-highlight' />
          </svg>
          <div className='absolute top-1 left-24 grid gap-1 rounded-md emphasis-floating px-2 py-1.5'>
            <Skel className='h-1.5 w-10' />
            <p className='text-xs/none font-semibold text-strong'>1,204</p>
          </div>
        </div>
      )
    case 'chart-patterns':
      return (
        <div className='flex h-16 w-36 items-end gap-2 text-subtle'>
          <ChartPatterns />
          {[
            ['h-10', 'fill-texture-1'],
            ['h-14', 'fill-texture-2'],
            ['h-8', 'fill-texture-3'],
            ['h-12', 'fill-texture-6']
          ].map(([height, texture]) => (
            <svg
              key={texture}
              className={`flex-1 overflow-hidden rounded-t-sm border border-normal ${height}`}
            >
              <rect width='100%' height='100%' className={texture} />
            </svg>
          ))}
        </div>
      )
    case 'show-dashboard':
      return (
        <div className='grid w-40 gap-1.5'>
          <div className='grid grid-cols-3 gap-1.5'>
            <Tile />
            <Tile />
            <Tile />
          </div>
          <div className='grid emphasis-raised gap-1.5 rounded-md p-2'>
            <Skel className='h-1.5 w-14' />
            <svg viewBox='0 0 140 24' className='h-6 w-full'>
              <polyline
                points='0,22 30,18 60,16 90,10 120,6 140,2'
                fill='none'
                strokeWidth={1.5}
                strokeDasharray='3 3'
                className='stroke-chart-context'
              />
              <polyline
                points='0,22 30,20 60,14 90,12 110,6'
                fill='none'
                strokeWidth={2}
                strokeLinejoin='round'
                className='stroke-chart-highlight'
              />
            </svg>
          </div>
        </div>
      )
    case 'portfolio-dashboard':
      return (
        <div className='grid w-40 gap-1.5'>
          <div className='grid grid-cols-2 gap-1.5'>
            <Tile />
            <Tile />
          </div>
          <div className='grid emphasis-raised divide-y divide-subtler rounded-md px-2'>
            {['w-12', 'w-9', 'w-14'].map((width) => (
              <div key={width} className='flex items-center gap-2 py-1.5'>
                <Skel className={`h-1.5 ${width}`} />
                <MeterBar className='ms-auto w-12' />
              </div>
            ))}
          </div>
        </div>
      )
    case 'audience-dashboard':
      return (
        <div className='grid w-40 grid-cols-2 gap-1.5'>
          <Tile />
          <Tile />
          <div className='grid emphasis-raised content-start gap-1 rounded-md p-2'>
            {['w-full', 'w-2/3', 'w-1/3'].map((width) => (
              <div
                key={width}
                className={`h-1.5 rounded-r-sm bg-chart-1 ${width}`}
              />
            ))}
          </div>
          <div className='grid emphasis-raised content-start gap-1 rounded-md p-2'>
            {['w-full', 'w-3/4', 'w-1/2'].map((width, i) => (
              <div
                key={width}
                className={`h-1.5 rounded-r-sm ${width} ${i === 0 ? 'bg-chart-highlight' : 'bg-chart-context'}`}
              />
            ))}
          </div>
        </div>
      )
    default:
      return <ComponentSkeleton name={name} />
  }
}
