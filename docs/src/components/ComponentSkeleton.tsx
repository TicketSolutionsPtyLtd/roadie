import { Logo } from '@oztix/roadie-components/logo'
import { QRCode } from '@oztix/roadie-components/qr-code'
import { Skeleton } from '@oztix/roadie-components/skeleton'

export function Skel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={`rounded-sm bg-strong/15 ${className ?? ''}`} {...props} />
  )
}

export function ComponentSkeleton({ name }: { name: string }) {
  switch (name) {
    case 'button':
      return (
        <div className='flex gap-2'>
          <div className='h-7 w-20 emphasis-strong rounded-full intent-accent' />
          <div className='h-7 w-20 emphasis-normal rounded-full' />
        </div>
      )
    case 'icon-button':
      return (
        <div className='flex gap-2'>
          <div className='grid size-8 emphasis-normal place-content-center rounded-full'>
            <Skel className='size-3.5 rounded-full' />
          </div>
          <div className='grid size-8 emphasis-normal place-content-center rounded-full'>
            <Skel className='size-3.5 rounded-full' />
          </div>
        </div>
      )
    case 'card':
      return (
        <div className='grid w-40 gap-2 rounded-lg border border-subtle bg-normal p-3'>
          <Skel className='h-2 w-16' />
          <Skel className='h-2 w-full' />
          <Skel className='h-2 w-24' />
        </div>
      )
    case 'image':
      return (
        <div className='relative h-24 w-40 overflow-hidden rounded-lg border border-subtle bg-normal'>
          <div className='absolute top-3.5 right-3.5 size-3.5 rounded-full bg-strong/15' />
          <div className='absolute -bottom-5 left-2 size-14 rotate-45 rounded-md bg-subtle' />
          <div className='absolute -bottom-7 left-16 size-20 rotate-45 rounded-md bg-strong/15' />
        </div>
      )
    case 'badge':
      return (
        <div className='flex gap-2'>
          <div className='h-5 w-12 emphasis-strong rounded-full intent-accent' />
          <div className='h-5 w-12 emphasis-strong rounded-full intent-success' />
          <div className='h-5 w-12 emphasis-strong rounded-full intent-warning' />
        </div>
      )
    case 'accordion':
      return (
        <div className='grid w-44 gap-1'>
          <div className='flex items-center justify-between rounded-md bg-normal px-3 py-2'>
            <Skel className='h-2 w-16' />
            <Skel className='size-2' />
          </div>
          <div className='rounded-md border border-subtle bg-normal px-3 py-2'>
            <Skel className='mb-1.5 h-2 w-20' />
            <Skel className='h-1.5 w-full' />
            <Skel className='mt-1 h-1.5 w-24' />
          </div>
          <div className='flex items-center justify-between rounded-md bg-normal px-3 py-2'>
            <Skel className='h-2 w-20' />
            <Skel className='size-2' />
          </div>
        </div>
      )
    case 'input':
      return (
        <div className='w-40 rounded-lg border border-subtle bg-normal px-3 py-2'>
          <Skel className='h-2 w-16 opacity-50' />
        </div>
      )
    case 'textarea':
      return (
        <div className='grid w-40 gap-1.5 rounded-lg border border-subtle bg-normal px-3 py-2'>
          <Skel className='h-2 w-24' />
          <Skel className='h-2 w-16' />
          <Skel className='h-2 w-10 opacity-50' />
        </div>
      )
    case 'select':
      return (
        <div className='flex w-40 items-center justify-between rounded-lg border border-subtle bg-normal px-3 py-2'>
          <Skel className='h-2 w-16' />
          <Skel className='size-2' />
        </div>
      )
    case 'field':
      return (
        <div className='grid w-40 gap-1.5'>
          <Skel className='h-2 w-12' />
          <div className='rounded-lg border border-subtle bg-normal px-3 py-2'>
            <Skel className='h-2 w-20 opacity-50' />
          </div>
          <Skel className='h-1.5 w-24 opacity-50' />
        </div>
      )
    case 'fieldset':
      return (
        <div className='grid w-44 gap-2 rounded-lg border border-subtle p-3'>
          <Skel className='h-2 w-16' />
          <div className='grid gap-1.5'>
            <div className='rounded-md border border-subtle bg-normal px-2 py-1.5'>
              <Skel className='h-1.5 w-20 opacity-50' />
            </div>
            <div className='rounded-md border border-subtle bg-normal px-2 py-1.5'>
              <Skel className='h-1.5 w-16 opacity-50' />
            </div>
          </div>
        </div>
      )
    case 'radio-group':
      return (
        <div className='grid gap-2'>
          <div className='flex items-center gap-2'>
            <div className='size-3.5 emphasis-strong rounded-full intent-accent' />
            <Skel className='h-2 w-14' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='size-3.5 rounded-full border-2 border-subtle' />
            <Skel className='h-2 w-16' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='size-3.5 rounded-full border-2 border-subtle' />
            <Skel className='h-2 w-12' />
          </div>
        </div>
      )
    case 'checkbox':
      return (
        <div className='grid gap-2'>
          <div className='flex items-center gap-2'>
            <div className='grid size-4 emphasis-strong place-content-center rounded-sm intent-accent'>
              <div className='mb-0.5 h-2 w-1 rotate-45 border-r-2 border-b-2 border-current' />
            </div>
            <Skel className='h-2 w-14' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='grid size-4 emphasis-strong place-content-center rounded-sm intent-accent'>
              <div className='mb-0.5 h-2 w-1 rotate-45 border-r-2 border-b-2 border-current' />
            </div>
            <Skel className='h-2 w-16' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='size-4 rounded-sm border-2 border-subtle' />
            <Skel className='h-2 w-12' />
          </div>
        </div>
      )
    case 'code':
      return (
        <div className='rounded-md emphasis-subtle px-2 py-0.5 font-mono text-xs'>
          console.log()
        </div>
      )
    case 'mark':
      return (
        <div className='flex gap-1 text-sm'>
          <span className='text-subtle'>Some</span>
          <span className='rounded-sm emphasis-subtle px-0.5 intent-accent'>
            highlighted
          </span>
          <span className='text-subtle'>text</span>
        </div>
      )
    case 'highlight':
      return (
        <div className='flex gap-1 text-sm'>
          <span className='text-subtle'>Search:</span>
          <span className='rounded-sm emphasis-subtle px-0.5 font-semibold intent-warning'>
            result
          </span>
        </div>
      )
    case 'prose':
      return (
        <div className='grid w-40 gap-1.5'>
          <Skel className='h-3 w-24' />
          <Skel className='h-1.5 w-full' />
          <Skel className='h-1.5 w-32' />
          <Skel className='h-1.5 w-28' />
        </div>
      )
    case 'breadcrumb':
      return (
        <div className='flex items-center gap-1.5 text-xs'>
          <Skel className='h-2 w-10' />
          <span className='text-subtler'>/</span>
          <Skel className='h-2 w-12' />
          <span className='text-subtler'>/</span>
          <Skel className='h-2 w-14' />
        </div>
      )
    case 'separator':
      return (
        <div className='grid w-40 gap-2'>
          <Skel className='h-2 w-20' />
          <div className='border-t border-normal' />
          <Skel className='h-2 w-24' />
        </div>
      )
    case 'spot-illustration':
      return (
        <div className='flex gap-3'>
          <div className='grid size-10 place-content-center rounded-lg bg-normal'>
            <Skel className='size-6 rounded-md' />
          </div>
          <div className='grid size-10 place-content-center rounded-lg bg-normal'>
            <Skel className='size-6 rounded-full' />
          </div>
          <div className='grid size-10 place-content-center rounded-lg bg-normal'>
            <Skel className='size-6 rounded-md' />
          </div>
        </div>
      )
    case 'label':
      return <Skel className='h-2 w-16' />
    case 'autocomplete':
      return (
        <div className='w-40 rounded-lg border border-subtle bg-normal px-3 py-2'>
          <Skel className='h-2 w-20 opacity-50' />
        </div>
      )
    case 'combobox':
      return (
        <div className='flex w-40 items-center justify-between rounded-lg border border-subtle bg-normal px-3 py-2'>
          <Skel className='h-2 w-20 opacity-50' />
          <Skel className='size-2' />
        </div>
      )
    case 'link-button':
      return (
        <div className='flex gap-2'>
          <div className='h-7 w-20 rounded-full emphasis-subtle intent-accent' />
          <div className='h-7 w-20 rounded-full emphasis-subtle' />
        </div>
      )
    case 'link-icon-button':
      return (
        <div className='flex gap-2'>
          <div className='grid size-8 place-content-center rounded-full emphasis-subtle'>
            <Skel className='size-3.5 rounded-full' />
          </div>
          <div className='grid size-8 place-content-center rounded-full emphasis-subtle'>
            <Skel className='size-3.5 rounded-full' />
          </div>
        </div>
      )
    case 'marquee':
      return (
        <div className='flex w-44 items-center gap-3 overflow-hidden'>
          <Skel className='h-6 w-14 shrink-0 rounded-md' />
          <Skel className='h-6 w-14 shrink-0 rounded-md' />
          <Skel className='h-6 w-14 shrink-0 rounded-md opacity-50' />
        </div>
      )
    case 'carousel':
      return (
        <div className='grid w-44 gap-2'>
          <div className='flex items-center gap-2 overflow-hidden'>
            <div className='grid h-12 w-20 shrink-0 place-content-center rounded-md bg-normal'>
              <Skel className='h-2 w-10' />
            </div>
            <div className='grid h-12 w-20 shrink-0 place-content-center rounded-md bg-normal'>
              <Skel className='h-2 w-10' />
            </div>
            <div className='grid h-12 w-20 shrink-0 place-content-center rounded-md bg-normal opacity-40'>
              <Skel className='h-2 w-10' />
            </div>
          </div>
          <div className='flex justify-center gap-1'>
            <div className='h-1.5 w-4 rounded-full bg-strong intent-accent' />
            <div className='size-1.5 rounded-full bg-strong/15' />
            <div className='size-1.5 rounded-full bg-strong/15' />
          </div>
        </div>
      )
    case 'icon-tile':
      return (
        <div className='flex items-center gap-3'>
          <div className='grid size-12 place-content-center rounded-full emphasis-subtle intent-accent'>
            <div className='size-5 rounded-sm bg-current opacity-60' />
          </div>
          <div className='grid size-12 place-content-center rounded-xl emphasis-subtle intent-accent'>
            <div className='size-5 rounded-sm bg-current opacity-60' />
          </div>
        </div>
      )
    case 'steps':
      return (
        <div className='flex items-center gap-1.5'>
          <div className='grid size-5 emphasis-strong place-content-center rounded-full text-xs font-bold intent-accent'>
            1
          </div>
          <Skel className='h-0.5 w-6' />
          <div className='grid size-5 emphasis-strong place-content-center rounded-full text-xs font-bold intent-accent'>
            2
          </div>
          <Skel className='h-0.5 w-6' />
          <div className='grid size-5 place-content-center rounded-full border-2 border-subtle text-xs font-bold text-subtle'>
            3
          </div>
        </div>
      )
    case 'dialog':
      return (
        <div className='grid w-40 emphasis-raised place-items-center gap-2 rounded-xl p-3'>
          <div className='size-7 rounded-full emphasis-subtle intent-accent' />
          <Skel className='h-2 w-20' />
          <Skel className='h-1.5 w-28' />
          <div className='mt-1 flex gap-1.5'>
            <div className='h-5 w-12 emphasis-normal rounded-full' />
            <div className='h-5 w-12 emphasis-strong rounded-full intent-accent' />
          </div>
        </div>
      )
    case 'popover':
      return (
        <div className='relative w-36 emphasis-raised rounded-xl p-3'>
          <div className='absolute -top-1 left-6 size-2 rotate-45 rounded-xs bg-raised' />
          <Skel className='mb-1.5 h-2 w-16' />
          <Skel className='h-1.5 w-24' />
        </div>
      )
    case 'empty-state':
      return (
        <div className='grid w-40 justify-items-center gap-2 text-center'>
          <div className='size-9 rounded-full bg-subtle' />
          <Skel className='mt-1 h-2.5 w-24' />
          <Skel className='h-1.5 w-32' />
          <div className='mt-1 h-6 w-20 emphasis-normal rounded-full' />
        </div>
      )
    case 'skeleton':
      return (
        <div className='flex w-40 items-center gap-3'>
          <Skeleton shape='circle' className='size-9' />
          <div className='grid flex-1 gap-2'>
            <Skeleton className='h-2' />
            <Skeleton className='h-2 w-2/3' />
          </div>
        </div>
      )
    case 'calendar-tile':
      return (
        <div className='grid w-14 overflow-hidden rounded-xl emphasis-subtle text-center intent-accent'>
          <div className='emphasis-strong py-0.5 text-xs leading-none font-bold tracking-wide'>
            NOV
          </div>
          <div className='py-1.5 text-xl leading-none font-bold'>27</div>
        </div>
      )
    case 'date-time':
      return (
        <div className='grid w-40 justify-items-center gap-1.5'>
          <p className='text-sm font-semibold text-strong'>Fri 27 Nov 2026</p>
          <p className='text-xs text-subtle'>7:30pm AEDT</p>
        </div>
      )
    case 'countdown':
      return (
        <div className='flex items-center gap-2 rounded-full emphasis-subtle px-3 py-1 intent-danger'>
          <div className='size-1.5 rounded-full bg-current' />
          <span className='text-sm font-semibold tabular-nums'>4:32</span>
        </div>
      )
    case 'duration':
      return (
        <div className='flex items-center gap-2'>
          <Skel className='h-2 w-14' />
          <span className='text-xs text-subtle'>&middot;</span>
          <span className='text-sm font-semibold text-strong'>2 hours</span>
        </div>
      )
    case 'logo':
      return <Logo aria-hidden size='lg' />
    case 'qr-code':
      return <QRCode value='A7K2MKWX' aria-hidden className='w-16' />
    case 'tabs':
      return (
        <div className='grid w-44 gap-3'>
          <div className='flex gap-1 rounded-full bg-normal p-1'>
            <div className='grid h-6 flex-1 emphasis-raised place-content-center rounded-full'>
              <Skel className='h-1.5 w-8' />
            </div>
            <div className='grid h-6 flex-1 place-content-center'>
              <Skel className='h-1.5 w-8' />
            </div>
            <div className='grid h-6 flex-1 place-content-center'>
              <Skel className='h-1.5 w-8' />
            </div>
          </div>
          <Skel className='h-1.5 w-full' />
          <Skel className='h-1.5 w-28' />
        </div>
      )
    case 'list':
      return (
        <div className='grid w-44 divide-y divide-subtle rounded-lg border border-subtle bg-normal px-3'>
          {['w-20', 'w-16', 'w-24'].map((width) => (
            <div key={width} className='flex items-center gap-2 py-2'>
              <div className='size-4 rounded-full bg-subtle' />
              <Skel className={`h-2 ${width}`} />
            </div>
          ))}
        </div>
      )
    case 'pane':
      return (
        <div className='grid h-24 w-44 grid-cols-[2fr_3fr] gap-1 rounded-lg border border-subtle bg-subtle p-1'>
          <div className='grid content-start gap-1.5 rounded-md bg-normal p-2'>
            <Skel className='h-2 w-10' />
            <Skel className='h-1.5 w-full' />
            <Skel className='h-1.5 w-8' />
          </div>
          <div className='grid content-start gap-1.5 rounded-md bg-normal p-2'>
            <Skel className='h-2.5 w-14' />
            <Skel className='h-1.5 w-full' />
            <Skel className='h-1.5 w-12' />
          </div>
        </div>
      )
    case 'navigator':
      return (
        <div className='flex h-24 w-44 gap-1 rounded-lg border border-subtle bg-subtle p-1'>
          <div className='grid content-start justify-items-center gap-2 rounded-md bg-normal px-1.5 py-2'>
            <div className='size-4 emphasis-strong rounded-md intent-accent' />
            <div className='size-4 rounded-md bg-strong/15' />
            <div className='size-4 rounded-md bg-strong/15' />
          </div>
          <div className='grid flex-1 content-start gap-1.5 rounded-md bg-normal p-2'>
            <Skel className='h-2.5 w-16' />
            <Skel className='h-1.5 w-full' />
            <Skel className='h-1.5 w-20' />
          </div>
        </div>
      )
    case 'scroll-area':
      return (
        <div className='relative grid h-24 w-40 content-start gap-2 overflow-hidden rounded-lg border border-subtle bg-normal py-3 ps-3 pe-5'>
          <Skel className='h-2 w-20' />
          <Skel className='h-1.5 w-full' />
          <Skel className='h-1.5 w-24' />
          <Skel className='h-1.5 w-full' />
          <Skel className='h-1.5 w-16' />
          <div className='absolute end-1.5 top-2 h-8 w-1 rounded-full bg-strong opacity-40' />
        </div>
      )
    case 'drawer':
      return (
        <div className='relative h-24 w-40 overflow-hidden rounded-lg border border-subtle bg-normal'>
          <div className='grid gap-1.5 p-3 opacity-40'>
            <Skel className='h-2 w-16' />
            <Skel className='h-1.5 w-20' />
          </div>
          <div className='absolute inset-x-2 bottom-0 grid emphasis-raised justify-items-center gap-1.5 rounded-t-xl px-3 pt-1.5 pb-3'>
            <div className='mb-0.5 h-1 w-6 rounded-full bg-strong/15' />
            <Skel className='h-2 w-16' />
            <Skel className='h-1.5 w-24' />
          </div>
        </div>
      )
    case 'tooltip':
      return (
        <div className='grid justify-items-center gap-2'>
          <div className='relative rounded-md emphasis-inverted px-2 py-1 text-xs'>
            Add to cart
            <div className='absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-xs bg-inverted' />
          </div>
          <div className='grid size-8 emphasis-normal place-content-center rounded-full'>
            <Skel className='size-3.5 rounded-full' />
          </div>
        </div>
      )
    default:
      return (
        <div className='grid w-40 gap-1.5'>
          <Skel className='h-2 w-20' />
          <Skel className='h-2 w-full' />
          <Skel className='h-2 w-16' />
        </div>
      )
  }
}
