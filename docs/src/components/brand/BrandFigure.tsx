import { Image } from '@/components/Image'

/** A brand image with an optional caption. Sizes are strings, so the markdown copy can render it. */
export function BrandFigure({
  src,
  width,
  height,
  alt,
  caption,
  frame
}: {
  src: string
  width: string
  height: string
  alt: string
  caption?: string
  /** Centres a small asset, such as a logo, in a padded frame instead of filling the width. */
  frame?: boolean
}) {
  const image = (
    <Image
      src={src}
      width={Number(width)}
      height={Number(height)}
      alt={alt}
      className={
        frame
          ? 'max-h-40 w-auto max-w-full'
          : 'h-auto w-full rounded-xl border border-subtler'
      }
    />
  )
  return (
    <figure data-not-prose data-slot='brand-figure' className='grid gap-2'>
      {frame ? (
        <div
          className='grid min-h-48 place-items-center rounded-xl border border-subtler p-6'
          // Logos keep their light ground in dark mode, so the frame does too.
          style={{ backgroundColor: 'var(--color-neutral-light-0)' }}
        >
          {image}
        </div>
      ) : (
        image
      )}
      {caption && (
        <figcaption className='text-sm text-subtle'>{caption}</figcaption>
      )}
    </figure>
  )
}

/** A `Guideline` example image, padded inside its frame so artwork never meets the edge. It draws for the site and stays out of the markdown copy. */
export function BrandExampleImage({
  src,
  width,
  height,
  alt
}: Omit<Parameters<typeof BrandFigure>[0], 'caption' | 'frame'>) {
  return (
    <div
      data-slot='brand-example-image'
      className='grid w-full place-items-center rounded-xl border border-subtler p-4'
      // Example artwork keeps its light ground in dark mode, so the mat does too.
      style={{ backgroundColor: 'var(--color-neutral-light-0)' }}
    >
      <Image
        src={src}
        width={Number(width)}
        height={Number(height)}
        alt={alt}
        className='h-auto w-full rounded-md'
      />
    </div>
  )
}
