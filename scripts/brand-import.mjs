#!/usr/bin/env node
// One-time import of the Confluence brand pages into docs/src/app/brand/
// (INNO-1149). Kept for the record and for a rerun, not for builds.
//
//   node scripts/brand-import.mjs pages
//     Drafts each page as MDX, with its images, in .scratch/brand-import/.
//     Needs CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN.
//   node scripts/brand-import.mjs logo <logo-pack.zip>
//   node scripts/brand-import.mjs pattern <slides-repo>
//   node scripts/brand-import.mjs illustrations <illustration-pack.zip>
//
// Drafts are a starting point: each page is hand edited to the brand template,
// and its text and images are checked for internal content before they move
// to docs/. The asset commands write straight to docs/public/brand/. Uses
// macOS `sips` to resize images, ImageMagick's `magick` for the illustration
// sheet, and `zip` and `unzip` for the packs.
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'docs/public/brand')
const DRAFTS = join(ROOT, '.scratch/brand-import')
const SITE = 'https://oztix.atlassian.net'

const PAGES = {
  overview: '814743554',
  logo: '372932645',
  'partner-logo-pack': '853803009',
  colour: '377684003',
  typography: '377651235',
  pattern: '377487415',
  illustration: '377454665',
  photography: '319094794'
}

// Links that stay internal: the text is kept, the link dropped.
const INTERNAL_LINK =
  /^\/|sharepoint\.com|figma\.com|slack\.com|drive\.google\.com|atlassian\.net|^mailto:/

const review = []

async function confluence(path) {
  const { CONFLUENCE_EMAIL: email, CONFLUENCE_API_TOKEN: token } = process.env
  if (!email || !token)
    throw new Error('Set CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN')
  const response = await fetch(`${SITE}/wiki${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`
    }
  })
  if (!response.ok) throw new Error(`${response.status} for ${path}`)
  return response
}

const linkKind = (href) =>
  href.startsWith('mailto:')
    ? 'an email address'
    : /^https?:/.test(href)
      ? `an internal link (${new URL(href).hostname})`
      : 'an internal link (Confluence)'

function inline(nodes = []) {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '\n'
      if (node.type === 'mention') {
        review.push('a mention of a person')
        return 'the brand team'
      }
      if (node.type !== 'text') return ''
      let text = node.text
      for (const mark of node.marks ?? []) {
        if (mark.type === 'strong') text = `**${text}**`
        if (mark.type === 'em') text = `_${text}_`
        if (mark.type === 'code') text = `\`${text}\``
        if (mark.type === 'link') {
          if (INTERNAL_LINK.test(mark.attrs.href))
            review.push(linkKind(mark.attrs.href))
          else text = `[${text}](${mark.attrs.href})`
        }
      }
      return text
    })
    .join('')
}

function block(node, context) {
  const children = (nodes, indent = '') =>
    (nodes ?? []).map((child) => block(child, { ...context, indent })).join('')
  const pad = context.indent ?? ''
  switch (node.type) {
    case 'paragraph': {
      const text = inline(node.content).trim()
      return text ? `${pad}${text}\n\n` : ''
    }
    case 'heading':
      return `${'#'.repeat(node.attrs.level)} ${inline(node.content)}\n\n`
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
      return (
        node.content
          .map((item, index) => {
            const bullet = node.type === 'orderedList' ? `${index + 1}.` : '-'
            // A task item holds text directly; a list item holds blocks.
            const body =
              item.type === 'taskItem'
                ? inline(item.content).trim()
                : children(item.content, `${pad}  `).trim()
            return `${pad}${bullet} ${body}\n`
          })
          .join('') + '\n'
      )
    case 'table': {
      const rows = node.content.map((row) =>
        row.content.map((cell) =>
          children(cell.content).trim().replace(/\n+/g, ' ')
        )
      )
      const divider = rows[0].map(() => '---')
      return [rows[0], divider, ...rows.slice(1)]
        .map((cells) => `| ${cells.join(' | ')} |`)
        .join('\n')
        .concat('\n\n')
    }
    case 'media': {
      const name = node.attrs.__fileName ?? node.attrs.alt
      context.media.push(name)
      const file = `${String(context.media.length).padStart(2, '0')}.jpg`
      return `![TODO describe ${name}](/brand/${context.slug}/${file})\n\n`
    }
    case 'emoji':
    case 'rule':
      return ''
    default:
      // Layouts, panels, expands, and media groups only wrap other blocks.
      return children(node.content, pad)
  }
}

async function saveImage(pageId, slug, name, index) {
  const listing = await confluence(
    `/rest/api/content/${pageId}/child/attachment?filename=${encodeURIComponent(name)}`
  ).then((response) => response.json())
  const download = listing.results[0]?._links.download
  if (!download) return review.push(`a missing attachment (${name})`)
  const raw = join(DRAFTS, 'raw', slug, name)
  mkdirSync(dirname(raw), { recursive: true })
  writeFileSync(
    raw,
    Buffer.from(await (await confluence(download)).arrayBuffer())
  )
  const out = join(
    DRAFTS,
    'images',
    slug,
    `${String(index).padStart(2, '0')}.jpg`
  )
  mkdirSync(dirname(out), { recursive: true })
  execFileSync(
    'sips',
    [
      '-Z',
      '1600',
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      '78',
      raw,
      '--out',
      out
    ],
    { stdio: 'ignore' }
  )
}

async function importPages() {
  mkdirSync(DRAFTS, { recursive: true })
  for (const [slug, id] of Object.entries(PAGES)) {
    const page = await confluence(
      `/api/v2/pages/${id}?body-format=atlas_doc_format`
    ).then((response) => response.json())
    const doc = JSON.parse(page.body.atlas_doc_format.value)
    const context = { slug, media: [] }
    const body = doc.content.map((node) => block(node, context)).join('')
    writeFileSync(
      join(DRAFTS, `${slug}.mdx`),
      `export const metadata = {\n  title: '${page.title}',\n  description: '',\n  category: 'Brand'\n}\n\n${body}`
    )
    for (const [index, name] of context.media.entries())
      await saveImage(id, slug, name, index + 1)
    console.log(`${slug}: ${context.media.length} images`)
  }
  const found = [...new Set(review)]
  if (found.length)
    console.log(`\nReview before committing:\n- ${found.join('\n- ')}`)
}

function withTempDir(use) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-import-'))
  try {
    return use(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const withUnzipped = (zip, use) =>
  withTempDir((dir) => {
    execFileSync('unzip', ['-q', zip, '-d', dir, '-x', '__MACOSX/*'])
    return use(dir)
  })

function zipFiles(out, cwd, files) {
  rmSync(out, { force: true })
  execFileSync('zip', ['-q', '-X', out, ...files], { cwd })
}

const findFiles = (cwd, pattern) =>
  execFileSync('find', ['.', '-name', pattern], { cwd, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .sort()

// Published name → file in the logo pack. Each image carries its own
// background, so the page reads the same in both themes.
const LOGO_IMAGES = {
  'primary.svg': 'With backgrounds/On light/Logo - Brand - Padding.svg',
  'primary-tagline.svg':
    'With backgrounds/On light/Logo - Brand - Tagline - Padding.svg',
  'secondary-tagline.svg':
    'With backgrounds/On light/Logo - Secondary - Brand - Tagline - Padding.svg',
  'on-light-dark.svg':
    'With backgrounds/On light/Logo - Dark - Tagline - Padding.svg',
  'on-dark-light.svg':
    'With backgrounds/On dark/Logo - Light - Tagline - Padding.svg',
  'on-brand-light.svg':
    'With backgrounds/On brand/Logo - Light - Tagline - Padding.svg',
  'social-profile.svg': 'Special applications/Social profile - On Dark.svg',
  'favicon.svg': 'Special applications/Favicon.svg'
}

const PARTNER_PACK = [
  'Primary/Oztix Logo - Colour - With padding.svg',
  'Primary/Oztix Logo - Dark - With padding -.svg',
  'Primary/Oztix Logo - Light - With padding - Oztix logo.svg',
  'Secondary/Oztix Logo - Secondary - Colour - With padding.svg',
  'Secondary/Oztix Logo - Secondary - Dark - With padding.svg',
  'Secondary/Oztix Logo - Secondary - Light - With padding.svg'
]

function importLogo(zip) {
  withUnzipped(zip, (pack) => {
    const out = join(PUBLIC, 'logo')
    mkdirSync(out, { recursive: true })
    for (const [name, file] of Object.entries(LOGO_IMAGES)) {
      copyFileSync(join(pack, file), join(out, name))
      // Some files in the pack are executable.
      chmodSync(join(out, name), 0o644)
    }
    const svgs = findFiles(pack, '*.svg')
    zipFiles(join(out, 'oztix-logo-pack.zip'), pack, svgs)
    zipFiles(join(out, 'oztix-partner-logo-pack.zip'), pack, PARTNER_PACK)
    console.log(
      `logo: ${Object.keys(LOGO_IMAGES).length} images, ${svgs.length} SVGs in the pack`
    )
  })
}

const SWIRL_FILL = '#c2dffb'

// The swirl paths of a Figma pattern symbol, matched by the house blue fill
// they were drawn in. Ground and colours are set again from Roadie's tokens.
function swirl(svg) {
  const viewBox = /<svg\b[^>]*\sviewBox="([^"]*)"/.exec(svg)[1]
  const paths = [...svg.matchAll(/<path\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter(
      (tag) => /\sfill="([^"]*)"/.exec(tag)?.[1]?.toLowerCase() === SWIRL_FILL
    )
    .map((tag) => /\sd="([^"]*)"/.exec(tag)[1])
  return { viewBox, paths }
}

function lightToken(css, name) {
  const value = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(
    css
  )?.[1]
  if (!value) throw new Error(`No --color-${name} in tokens.css`)
  return value
}

// House intent → the scale its fixed light steps come from.
const PATTERN_SCALES = {
  blue: 'brand',
  purple: 'info',
  orange: 'brand-secondary'
}

// The crops the page shows; the rest go only in the pack.
const PATTERN_IMAGES = ['pattern-banner-blue.svg']

function importPattern(slides) {
  const css = readFileSync(
    join(ROOT, 'packages/core/src/css/tokens.css'),
    'utf8'
  )
  const out = join(PUBLIC, 'pattern')
  mkdirSync(out, { recursive: true })
  withTempDir((pack) => {
    const files = []
    for (const crop of ['top', 'left', 'right', 'banner']) {
      const { viewBox, paths } = swirl(
        readFileSync(join(slides, 'src/kit/brand/figma', `${crop}.svg`), 'utf8')
      )
      const [, , width, height] = viewBox.split(' ').map(Number)
      const sheet = []
      for (const [hue, scale] of Object.entries(PATTERN_SCALES)) {
        const ground = lightToken(css, `${scale}-light-9`)
        const line = lightToken(css, `${scale}-light-5`)
        const art = (x = 0) =>
          `<svg x="${x}" viewBox="${viewBox}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${ground}"/><g fill="${line}">${paths.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`
        const file = `pattern-${crop}-${hue}.svg`
        writeFileSync(
          join(pack, file),
          `${art().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')}\n`
        )
        files.push(file)
        sheet.push(art(sheet.length * (width + 48)))
      }
      // The three colours side by side, so the page shows them as one image.
      if (crop === 'right')
        writeFileSync(
          join(out, 'pattern-colours.svg'),
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width * 3 + 96} ${height}" width="${width * 3 + 96}" height="${height}">${sheet.join('')}</svg>\n`
        )
    }
    for (const file of PATTERN_IMAGES)
      copyFileSync(join(pack, file), join(out, file))
    zipFiles(join(out, 'oztix-pattern-pack.zip'), pack, files)
    console.log(`pattern: ${files.length} SVGs`)
  })
}

function importIllustrations(zip) {
  withUnzipped(zip, (unpacked) => {
    // Zip from inside the pack's own folder, so its numbering stays out.
    const pack = join(unpacked, '05 Illustrations')
    const out = join(PUBLIC, 'illustration')
    mkdirSync(out, { recursive: true })
    const keyFiles = findFiles(join(pack, 'Key Illustrations'), '*.png').map(
      (file) => join('Key Illustrations', file)
    )
    // One sheet on white, since the line work is dark and the art stays light.
    execFileSync(
      'magick',
      [
        'montage',
        ...keyFiles,
        '-tile',
        '6x',
        '-geometry',
        '160x160+16+16',
        '-background',
        'white',
        '-colors',
        '96',
        `PNG8:${join(out, 'key-illustrations.png')}`
      ],
      { cwd: pack }
    )
    const spot = findFiles(pack, '*.svg')
    zipFiles(join(out, 'oztix-illustration-pack.zip'), pack, [
      ...keyFiles,
      ...spot
    ])
    console.log(
      `illustration: ${keyFiles.length} key illustrations, ${spot.length} spot SVGs`
    )
  })
}

const [command, source] = process.argv.slice(2)
const commands = {
  pages: importPages,
  logo: importLogo,
  pattern: importPattern,
  illustrations: importIllustrations
}
if (!commands[command] || (command !== 'pages' && !source)) {
  console.error(
    'Usage: node scripts/brand-import.mjs pages | logo <zip> | pattern <slides-repo> | illustrations <zip>'
  )
  process.exit(1)
}
await commands[command](source)
