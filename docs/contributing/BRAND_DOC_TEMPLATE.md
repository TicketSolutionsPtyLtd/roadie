# Brand documentation template

**Starting point.** The Brand section doesn't exist yet. INNO-1149 imports
the brand pages from Confluence and refines this template from what they need.
Follow [`DOCS_PAGES.md`](DOCS_PAGES.md) too.

A brand page says how Oztix looks and sounds outside a single interface:
Overview, Logo, Colour, Typography, Pattern, Illustration, and Photography.
Where the brand meets the code, it links to the foundation or component page
rather than repeating it.

## Structure

```mdx
export const metadata = {
  title: 'Logo',
  description: 'One sentence on what this part of the brand is.',
  category: 'Brand'
}

import { Guideline, Guidelines } from '@/components/Guideline'
import { Image } from '@/components/Image'

Two or three sentences on what this part of the brand is for.

## Usage

When and where to use it, with an image of each case.

<Image
  src='/brand/logo/primary.png'
  width={640}
  height={240}
  alt='The Oztix logo on a light background'
/>

## Downloads

- [Partner logo pack](/brand/logo/partner-logo-pack.zip), with the files it
  holds and their formats.

## Guidelines

- A rule that needs no picture.

<Guidelines>

<Guideline title='Leave clear space around the logo'>
  <Guideline.Do
    example={
      <Image
        src='/brand/logo/clear-space.png'
        width={320}
        height={160}
        alt='The logo with clear space'
      />
    }
  >
    Keep the clear space free of text and images.
  </Guideline.Do>
  <Guideline.Dont>Don't place text inside the clear space.</Guideline.Dont>
</Guideline>

</Guidelines>

## In Roadie

Which tokens, utilities, or components carry this part of the brand, with
links to their pages.
```

## Rules

1. **Images and downloads are local.** They live in `docs/public/brand/`,
   never on Confluence or a third-party host.
2. **Images go through `Image`** from `@/components/Image`, which adds the
   site's base path that a bare markdown image misses. INNO-1149 decides
   whether `Image` becomes the MDX `img` mapping, and how downloads get the
   base path.
3. **Every image has alt text** that says what the image shows, not its file
   name.
4. **Check each page before it's published.** Nothing internal or sensitive,
   such as client names, contract terms, or staff contacts.
5. **Link, don't repeat.** Colour values belong to `/tokens/`, and component
   usage to the component page. The brand page says why and links there.
6. **Category** waits on the Brand catalogue in
   `docs/src/lib/page-manifest.ts`, which INNO-1149 adds.
