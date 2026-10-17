/** An illustration in the brand library: the SVG at `/brand/illustrations/{slug}.svg`. */
export type BrandIllustration = {
  slug: string
  label: string
  tags: string[]
  /** The SpotIllustration component that draws it in apps, when there is one. */
  component?: string
}

// Generated from the illustration pack and Roadie's SpotIllustration SVGs; add one entry per illustration.
export const BRAND_ILLUSTRATIONS: BrandIllustration[] = [
  {
    slug: 'abstract-meat',
    label: 'Abstract meat',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'abstract-ring',
    label: 'Abstract ring',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'abstract-tube',
    label: 'Abstract tube',
    tags: ['shape', 'decoration']
  },
  { slug: 'ampersand', label: 'Ampersand', tags: ['letter', 'type'] },
  { slug: 'apple', label: 'Apple', tags: ['nature', 'outdoors'] },
  {
    slug: 'arch-curve-1',
    label: 'Arch curve 1',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'arch-curve-2',
    label: 'Arch curve 2',
    tags: ['shape', 'decoration']
  },
  { slug: 'arch-window', label: 'Arch window', tags: ['venue', 'place'] },
  { slug: 'arrow', label: 'Arrow', tags: ['growth', 'reporting'] },
  { slug: 'arrow-down', label: 'Arrow down', tags: ['growth', 'reporting'] },
  {
    slug: 'arrow-turn-up',
    label: 'Arrow turn up',
    tags: ['growth', 'reporting']
  },
  {
    slug: 'arrow-up-right',
    label: 'Arrow up right',
    tags: ['growth', 'reporting', 'roadie'],
    component: 'ArrowUpRight'
  },
  {
    slug: 'badge-of-honor',
    label: 'Badge of honor',
    tags: ['entertainment', 'fun']
  },
  { slug: 'ban-prohibit', label: 'Ban prohibit', tags: ['status', 'help'] },
  { slug: 'bang', label: 'Bang', tags: ['status', 'help'] },
  { slug: 'bill-paper', label: 'Bill paper', tags: ['money', 'sales'] },
  {
    slug: 'block-corner',
    label: 'Block corner',
    tags: ['shape', 'decoration']
  },
  { slug: 'block-dash', label: 'Block dash', tags: ['shape', 'decoration'] },
  {
    slug: 'block-i-slim',
    label: 'Block i slim',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'block-l-corner',
    label: 'Block l corner',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'block-l-left',
    label: 'Block l left',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'block-l-right',
    label: 'Block l right',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'block-stairs',
    label: 'Block stairs',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'block-t-cross',
    label: 'Block t cross',
    tags: ['shape', 'decoration', 'status', 'help']
  },
  {
    slug: 'block-z-zigzag-left',
    label: 'Block z zigzag left',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'block-z-zigzag-right',
    label: 'Block z zigzag right',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'block-zigzag-vertical-left',
    label: 'Block zigzag vertical left',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'block-zigzag-vertical-right',
    label: 'Block zigzag vertical right',
    tags: ['shape', 'decoration']
  },
  { slug: 'book', label: 'Book', tags: ['digital', 'communication'] },
  { slug: 'bookmark', label: 'Bookmark', tags: ['digital', 'communication'] },
  {
    slug: 'bookmark-ribbon',
    label: 'Bookmark ribbon',
    tags: ['digital', 'communication']
  },
  { slug: 'bow', label: 'Bow', tags: ['hospitality', 'events'] },
  { slug: 'bridge-arch', label: 'Bridge arch', tags: ['venue', 'place'] },
  {
    slug: 'bubble-circle',
    label: 'Bubble circle',
    tags: ['shape', 'decoration', 'digital', 'communication']
  },
  {
    slug: 'bubble-rotate',
    label: 'Bubble rotate',
    tags: ['digital', 'communication']
  },
  {
    slug: 'bubble-smoke',
    label: 'Bubble smoke',
    tags: ['digital', 'communication']
  },
  {
    slug: 'bubble-square',
    label: 'Bubble square',
    tags: ['shape', 'decoration', 'digital', 'communication']
  },
  { slug: 'bush', label: 'Bush', tags: ['nature', 'outdoors'] },
  { slug: 'cactus', label: 'Cactus', tags: ['nature', 'outdoors'] },
  { slug: 'camera', label: 'Camera', tags: ['digital', 'communication'] },
  { slug: 'cat', label: 'Cat', tags: ['animals', 'fun'] },
  {
    slug: 'cd-disc-vinyl',
    label: 'Cd disc vinyl',
    tags: ['music', 'live music']
  },
  { slug: 'check-correct', label: 'Check correct', tags: ['status', 'help'] },
  { slug: 'chestnut', label: 'Chestnut', tags: ['nature', 'outdoors'] },
  {
    slug: 'christmas-tree',
    label: 'Christmas tree',
    tags: ['nature', 'outdoors']
  },
  { slug: 'circle-tube', label: 'Circle tube', tags: ['shape', 'decoration'] },
  {
    slug: 'circle-tube-2',
    label: 'Circle tube 2',
    tags: ['shape', 'decoration']
  },
  { slug: 'cloud', label: 'Cloud', tags: ['nature', 'outdoors'] },
  {
    slug: 'cloud-puff',
    label: 'Cloud puff',
    tags: ['nature', 'outdoors', 'shape', 'decoration']
  },
  { slug: 'cloud-rotate', label: 'Cloud rotate', tags: ['nature', 'outdoors'] },
  { slug: 'clover', label: 'Clover', tags: ['nature', 'outdoors'] },
  { slug: 'cow', label: 'Cow', tags: ['animals', 'fun'] },
  {
    slug: 'cowboy-hat',
    label: 'Cowboy hat',
    tags: ['entertainment', 'fun', 'animals', 'roadie'],
    component: 'CowboyHat'
  },
  { slug: 'crescent-moon', label: 'Crescent moon', tags: ['object'] },
  { slug: 'cross', label: 'Cross', tags: ['status', 'help'] },
  { slug: 'cross-false', label: 'Cross false', tags: ['status', 'help'] },
  { slug: 'crown', label: 'Crown', tags: ['entertainment', 'fun'] },
  { slug: 'cup-coffee', label: 'Cup coffee', tags: ['hospitality', 'events'] },
  {
    slug: 'cursor',
    label: 'Cursor',
    tags: ['digital', 'communication', 'roadie'],
    component: 'Cursor'
  },
  {
    slug: 'cursor-hand',
    label: 'Cursor hand',
    tags: ['digital', 'communication', 'people', 'partners']
  },
  { slug: 'diamond', label: 'Diamond', tags: ['shape', 'decoration'] },
  {
    slug: 'diamond-rhombus',
    label: 'Diamond rhombus',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'diamond-shape',
    label: 'Diamond shape',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'double-square',
    label: 'Double square',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'ellipse-circle',
    label: 'Ellipse circle',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'exclamation-mark',
    label: 'Exclamation mark',
    tags: ['status', 'help']
  },
  { slug: 'explode', label: 'Explode', tags: ['energy', 'highlight'] },
  { slug: 'eye', label: 'Eye', tags: ['digital', 'communication'] },
  {
    slug: 'eye-crossed',
    label: 'Eye crossed',
    tags: ['digital', 'communication', 'status', 'help']
  },
  { slug: 'fire', label: 'Fire', tags: ['energy', 'highlight'] },
  { slug: 'fish', label: 'Fish', tags: ['animals', 'fun'] },
  { slug: 'flag', label: 'Flag', tags: ['venue', 'place'] },
  { slug: 'flag-pole', label: 'Flag pole', tags: ['venue', 'place'] },
  { slug: 'flash-light', label: 'Flash light', tags: ['status', 'help'] },
  { slug: 'flower', label: 'Flower', tags: ['nature', 'outdoors'] },
  {
    slug: 'flower-abstract',
    label: 'Flower abstract',
    tags: ['nature', 'outdoors', 'shape', 'decoration']
  },
  { slug: 'flower-bloom', label: 'Flower bloom', tags: ['nature', 'outdoors'] },
  {
    slug: 'flower-bloom-asterisk',
    label: 'Flower bloom asterisk',
    tags: ['nature', 'outdoors']
  },
  {
    slug: 'flower-cross',
    label: 'Flower cross',
    tags: ['nature', 'outdoors', 'status', 'help']
  },
  { slug: 'flower-cute', label: 'Flower cute', tags: ['nature', 'outdoors'] },
  {
    slug: 'flower-rotate',
    label: 'Flower rotate',
    tags: ['nature', 'outdoors']
  },
  {
    slug: 'flower-spiral',
    label: 'Flower spiral',
    tags: ['nature', 'outdoors', 'roadie'],
    component: 'FlowerSpiral'
  },
  {
    slug: 'flower-star',
    label: 'Flower star',
    tags: ['nature', 'outdoors', 'energy', 'highlight']
  },
  { slug: 'flower-tulip', label: 'Flower tulip', tags: ['nature', 'outdoors'] },
  {
    slug: 'football',
    label: 'Football',
    tags: ['entertainment', 'fun', 'roadie'],
    component: 'Football'
  },
  { slug: 'ghost', label: 'Ghost', tags: ['entertainment', 'fun'] },
  { slug: 'globe-world', label: 'Globe world', tags: ['venue', 'place'] },
  { slug: 'grass', label: 'Grass', tags: ['nature', 'outdoors'] },
  {
    slug: 'hand',
    label: 'Hand',
    tags: ['people', 'partners', 'roadie'],
    component: 'Hand'
  },
  {
    slug: 'heart',
    label: 'Heart',
    tags: ['people', 'partners', 'roadie'],
    component: 'Heart'
  },
  { slug: 'heart-pixel', label: 'Heart pixel', tags: ['people', 'partners'] },
  { slug: 'hexagon', label: 'Hexagon', tags: ['shape', 'decoration'] },
  {
    slug: 'high-five',
    label: 'High five',
    tags: ['people', 'partners', 'roadie'],
    component: 'HighFive'
  },
  {
    slug: 'house-pentagon',
    label: 'House pentagon',
    tags: ['venue', 'place', 'shape', 'decoration']
  },
  { slug: 'l-shape', label: 'L shape', tags: ['shape', 'decoration'] },
  { slug: 'leaf', label: 'Leaf', tags: ['nature', 'outdoors'] },
  { slug: 'leaf-tree', label: 'Leaf tree', tags: ['nature', 'outdoors'] },
  { slug: 'letter-a', label: 'Letter a', tags: ['letter', 'type'] },
  { slug: 'letter-d', label: 'Letter d', tags: ['letter', 'type'] },
  { slug: 'letter-e', label: 'Letter e', tags: ['letter', 'type'] },
  { slug: 'letter-h', label: 'Letter h', tags: ['letter', 'type'] },
  { slug: 'letter-i', label: 'Letter i', tags: ['letter', 'type'] },
  { slug: 'letter-l', label: 'Letter l', tags: ['letter', 'type'] },
  { slug: 'letter-n', label: 'Letter n', tags: ['letter', 'type'] },
  { slug: 'letter-p', label: 'Letter p', tags: ['letter', 'type'] },
  { slug: 'letter-q', label: 'Letter q', tags: ['letter', 'type'] },
  { slug: 'letter-r', label: 'Letter r', tags: ['letter', 'type'] },
  { slug: 'letter-s', label: 'Letter s', tags: ['letter', 'type'] },
  { slug: 'letter-t', label: 'Letter t', tags: ['letter', 'type'] },
  { slug: 'letter-v', label: 'Letter v', tags: ['letter', 'type'] },
  { slug: 'letter-y', label: 'Letter y', tags: ['letter', 'type'] },
  {
    slug: 'lightning-bolt',
    label: 'Lightning bolt',
    tags: ['energy', 'highlight']
  },
  { slug: 'magnet', label: 'Magnet', tags: ['status', 'help'] },
  {
    slug: 'magnify-glass',
    label: 'Magnify glass',
    tags: ['digital', 'communication']
  },
  { slug: 'mail', label: 'Mail', tags: ['digital', 'communication'] },
  {
    slug: 'map-pin',
    label: 'Map pin',
    tags: ['venue', 'place', 'roadie'],
    component: 'MapPin'
  },
  {
    slug: 'mobile-phone',
    label: 'Mobile phone',
    tags: ['digital', 'communication']
  },
  { slug: 'money-cash', label: 'Money cash', tags: ['money', 'sales'] },
  { slug: 'mountain', label: 'Mountain', tags: ['venue', 'place'] },
  { slug: 'note', label: 'Note', tags: ['music', 'live music'] },
  {
    slug: 'note-eighth-music',
    label: 'Note eighth music',
    tags: ['music', 'live music']
  },
  {
    slug: 'note-half-music',
    label: 'Note half music',
    tags: ['music', 'live music']
  },
  {
    slug: 'note-music',
    label: 'Note music',
    tags: ['music', 'live music', 'roadie'],
    component: 'NoteMusic'
  },
  { slug: 'number-0-zero', label: 'Number 0 zero', tags: ['number', 'count'] },
  { slug: 'number-1-one', label: 'Number 1 one', tags: ['number', 'count'] },
  { slug: 'number-2-two', label: 'Number 2 two', tags: ['number', 'count'] },
  {
    slug: 'number-3-three',
    label: 'Number 3 three',
    tags: ['number', 'count']
  },
  { slug: 'number-4-four', label: 'Number 4 four', tags: ['number', 'count'] },
  { slug: 'number-5-five', label: 'Number 5 five', tags: ['number', 'count'] },
  { slug: 'number-6-six', label: 'Number 6 six', tags: ['number', 'count'] },
  {
    slug: 'number-7-seven',
    label: 'Number 7 seven',
    tags: ['number', 'count']
  },
  {
    slug: 'number-8-eight',
    label: 'Number 8 eight',
    tags: ['number', 'count']
  },
  { slug: 'number-9-nine', label: 'Number 9 nine', tags: ['number', 'count'] },
  { slug: 'octagon', label: 'Octagon', tags: ['shape', 'decoration'] },
  { slug: 'partnership', label: 'Partnership', tags: ['people', 'partners'] },
  { slug: 'peanut-1', label: 'Peanut 1', tags: ['shape', 'decoration'] },
  { slug: 'peanut-2', label: 'Peanut 2', tags: ['shape', 'decoration'] },
  { slug: 'pencil', label: 'Pencil', tags: ['digital', 'communication'] },
  { slug: 'pentagon', label: 'Pentagon', tags: ['shape', 'decoration'] },
  { slug: 'pie-chart', label: 'Pie chart', tags: ['growth', 'reporting'] },
  { slug: 'pie-slice', label: 'Pie slice', tags: ['growth', 'reporting'] },
  { slug: 'piece-cake', label: 'Piece cake', tags: ['hospitality', 'events'] },
  {
    slug: 'piece-cake-square',
    label: 'Piece cake square',
    tags: ['shape', 'decoration', 'hospitality', 'events']
  },
  { slug: 'pine-cones', label: 'Pine cones', tags: ['nature', 'outdoors'] },
  {
    slug: 'pixel-cross-joy-stick',
    label: 'Pixel cross joy stick',
    tags: ['entertainment', 'fun', 'status', 'help']
  },
  { slug: 'puzzle-cube', label: 'Puzzle cube', tags: ['entertainment', 'fun'] },
  {
    slug: 'quarter-circle',
    label: 'Quarter circle',
    tags: ['shape', 'decoration']
  },
  { slug: 'question-mark', label: 'Question mark', tags: ['status', 'help'] },
  { slug: 'rainbow', label: 'Rainbow', tags: ['growth', 'reporting'] },
  { slug: 'rock', label: 'Rock', tags: ['nature', 'outdoors'] },
  { slug: 's-line', label: 'S line', tags: ['shape', 'decoration'] },
  { slug: 'sand-glass', label: 'Sand glass', tags: ['status', 'help'] },
  { slug: 'shrub', label: 'Shrub', tags: ['nature', 'outdoors'] },
  {
    slug: 'shuriken-star-spiral',
    label: 'Shuriken star spiral',
    tags: ['energy', 'highlight']
  },
  { slug: 'sign', label: 'Sign', tags: ['venue', 'place'] },
  {
    slug: 'sparkling-glitter-star',
    label: 'Sparkling glitter star',
    tags: ['energy', 'highlight']
  },
  {
    slug: 'sparkling-glitter-star-rotate',
    label: 'Sparkling glitter star rotate',
    tags: ['energy', 'highlight']
  },
  {
    slug: 'sparkling-glitter-wink',
    label: 'Sparkling glitter wink',
    tags: ['energy', 'highlight']
  },
  { slug: 'sponge', label: 'Sponge', tags: ['status', 'help'] },
  {
    slug: 'square-cube-box',
    label: 'Square cube box',
    tags: ['shape', 'decoration']
  },
  { slug: 'stamp-frame', label: 'Stamp frame', tags: ['shape', 'decoration'] },
  { slug: 'star', label: 'Star', tags: ['energy', 'highlight'] },
  { slug: 'star-rotate', label: 'Star rotate', tags: ['energy', 'highlight'] },
  {
    slug: 'sticker-circle',
    label: 'Sticker circle',
    tags: ['shape', 'decoration']
  },
  { slug: 'sun', label: 'Sun', tags: ['nature', 'outdoors'] },
  {
    slug: 'tape-cassette-music',
    label: 'Tape cassette music',
    tags: ['music', 'live music']
  },
  {
    slug: 'ticket',
    label: 'Ticket',
    tags: ['tickets', 'events', 'roadie'],
    component: 'Ticket'
  },
  { slug: 'ticket-side', label: 'Ticket side', tags: ['tickets', 'events'] },
  { slug: 'ticket-tag', label: 'Ticket tag', tags: ['tickets', 'events'] },
  {
    slug: 'triangle-prism',
    label: 'Triangle prism',
    tags: ['shape', 'decoration']
  },
  {
    slug: 'triple-semi-circle',
    label: 'Triple semi circle',
    tags: ['shape', 'decoration']
  },
  { slug: 'vase', label: 'Vase', tags: ['hospitality', 'events'] },
  { slug: 'washi-tape', label: 'Washi tape', tags: ['shape', 'decoration'] },
  { slug: 'web-page', label: 'Web page', tags: ['digital', 'communication'] },
  {
    slug: 'wine-glass',
    label: 'Wine glass',
    tags: ['hospitality', 'events', 'roadie'],
    component: 'WineGlass'
  },
  { slug: 'wing', label: 'Wing', tags: ['animals', 'fun'] }
]
