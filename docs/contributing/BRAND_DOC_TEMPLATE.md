# Brand documentation template

Brand pages live in `docs/src/app/brand/`, under the Brand menu. Its index,
`brand/page.mdx`, is the overview. INNO-1149 imported them from Confluence.
Follow [`DOCS_PAGES.md`](DOCS_PAGES.md) too.

A brand page says how Oztix looks and sounds outside a single interface:
Overview, Logo, Colour, Typography, Pattern, Illustration, and Photography.
It shows before it tells, and where the brand meets the code, it links to the
foundation or component page rather than repeating it.

## Structure

```mdx
export const metadata = {
  title: 'Logo',
  description: 'One sentence on what this part of the brand is.',
  category: 'Brand',
  order: 3
}

import { Guideline, Guidelines } from '@/components/Guideline'
import { PairTable } from '@/components/PairTable'
import { BrandFigure } from '@/components/brand/BrandFigure'
import { BrandFigureGrid } from '@/components/brand/BrandFigureGrid'
import { DownloadCard } from '@/components/brand/DownloadCard'
import { LogoExample } from '@/components/brand/LogoExample'

<BrandFigureGrid>

<BrandFigure
  src='/brand/logo/primary-tagline.svg'
  width='520'
  height='80'
  alt='The blue logo with tagline on white'
  caption='Brand, on white or light backgrounds.'
/>

</BrandFigureGrid>

Two or three sentences on what this part of the brand is for.

## Usage

A one or two sentence lead, then the cases, each with a picture.

<PairTable>

| Market | Colour                 |
| ------ | ---------------------- |
| Music  | Purple, alongside blue |

</PairTable>

## Downloads

<DownloadCard
  title='Partner logo pack'
  href='/brand/logo/oztix-partner-logo-pack.zip'
  formats='SVG and EPS'
  size='29 KB'
  description='What the pack holds and who uses it.'
/>

## Guidelines

A lead sentence.

<Guidelines>

<Guideline title='Leave clear space around the logo'>
  <Guideline.Do example={<LogoExample kind='clearSpace' version='do' />}>
    Keep the clear space free of text and images.
  </Guideline.Do>
  <Guideline.Dont example={<LogoExample kind='clearSpace' version='dont' />}>
    Place text inside the clear space.
  </Guideline.Dont>
</Guideline>

</Guidelines>

- A rule that needs no picture.

## In Roadie

Which tokens, utilities, or components carry this part of the brand, with
links to their pages.
```

## Rules

1. **Show before you tell.** A page opens with its strongest visual, such as
   the lockups, a swatch strip, a type specimen, the pattern, or a photo grid,
   then a short intro. Each section has a one or two sentence lead.
2. **Images and downloads are local.** They live in `docs/public/brand/`,
   never on Confluence or a third-party host. Photos are WebP at 1280px wide
   or less, and logos and artwork SVG.
3. **Draw with the live component where Roadie has one**, such as `Logo`,
   `Pattern`, `Mark`, or the spot illustrations, rather than a picture of it.
   Other images are `BrandFigure`s, in a `BrandFigureGrid` for a gallery. Give
   `frame` to a small asset such as a logo, so it centres in a padded frame.
   Props are literal strings, such as `width='640'`, so the markdown copy
   renders each as an image with its caption.
4. **A `Guideline` example is drawing-only**: a docs component such as
   `LogoExample` or `PatternExample` that draws the live component, or
   `BrandExampleImage` for a photo. It stays out of the markdown copy, so the
   text beside it says what it shows.
5. **Downloads are `DownloadCard`s**, beside the asset they belong to, with
   their formats and size. The markdown copy links the file itself.
6. **Rules with something to show are `Guideline` pairs** with a picture or
   a live Roadie component, such as `Mark`, `Logo`, `Pattern`, or `Button`.
   Two-column specs are a `PairTable`.
7. **Every image has alt text** that says what it shows.
8. **Check each page before it's published.** Nothing internal or sensitive,
   such as client names, contract terms, staff contacts, or screenshots of
   internal tools.
9. **Link, don't repeat.** Colour values belong to `/tokens/`, and component
   usage to the component page. The brand page says why and links there.
10. **Category** is `Brand`, the one category of the `BRAND` catalogue in
    `docs/src/lib/page-manifest.ts`. `order` sets the page's place in the menu.
