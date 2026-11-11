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
    tags: ['shape', 'decoration'],
    component: 'AbstractMeat'
  },
  {
    slug: 'abstract-ring',
    label: 'Abstract ring',
    tags: ['shape', 'decoration'],
    component: 'AbstractRing'
  },
  {
    slug: 'abstract-tube',
    label: 'Abstract tube',
    tags: ['shape', 'decoration'],
    component: 'AbstractTube'
  },
  {
    slug: 'ampersand',
    label: 'Ampersand',
    tags: ['letter', 'type'],
    component: 'Ampersand'
  },
  {
    slug: 'apple',
    label: 'Apple',
    tags: ['nature', 'outdoors'],
    component: 'Apple'
  },
  {
    slug: 'arch-curve-1',
    label: 'Arch curve 1',
    tags: ['shape', 'decoration'],
    component: 'ArchCurve1'
  },
  {
    slug: 'arch-curve-2',
    label: 'Arch curve 2',
    tags: ['shape', 'decoration'],
    component: 'ArchCurve2'
  },
  {
    slug: 'arch-window',
    label: 'Arch window',
    tags: ['venue', 'place'],
    component: 'ArchWindow'
  },
  { slug: 'arrow', label: 'Arrow', tags: ['growth', 'reporting'] },
  {
    slug: 'arrow-down',
    label: 'Arrow down',
    tags: ['growth', 'reporting'],
    component: 'ArrowDown'
  },
  {
    slug: 'arrow-turn-up',
    label: 'Arrow turn up',
    tags: ['growth', 'reporting'],
    component: 'ArrowTurnUp'
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
    tags: ['entertainment', 'fun'],
    component: 'BadgeOfHonour'
  },
  {
    slug: 'ban-prohibit',
    label: 'Ban prohibit',
    tags: ['status', 'help'],
    component: 'BanProhibit'
  },
  { slug: 'bang', label: 'Bang', tags: ['status', 'help'], component: 'Bang' },
  {
    slug: 'bill-paper',
    label: 'Bill paper',
    tags: ['money', 'sales'],
    component: 'BillPaper'
  },
  {
    slug: 'block-corner',
    label: 'Block corner',
    tags: ['shape', 'decoration'],
    component: 'BlockCorner'
  },
  {
    slug: 'block-dash',
    label: 'Block dash',
    tags: ['shape', 'decoration'],
    component: 'BlockDash'
  },
  {
    slug: 'block-i-slim',
    label: 'Block i slim',
    tags: ['shape', 'decoration'],
    component: 'BlockISlim'
  },
  {
    slug: 'block-l-corner',
    label: 'Block l corner',
    tags: ['shape', 'decoration'],
    component: 'BlockLCorner'
  },
  {
    slug: 'block-l-left',
    label: 'Block l left',
    tags: ['shape', 'decoration'],
    component: 'BlockLLeft'
  },
  {
    slug: 'block-l-right',
    label: 'Block l right',
    tags: ['shape', 'decoration'],
    component: 'BlockLRight'
  },
  {
    slug: 'block-stairs',
    label: 'Block stairs',
    tags: ['shape', 'decoration'],
    component: 'BlockStairs'
  },
  {
    slug: 'block-t-cross',
    label: 'Block t cross',
    tags: ['shape', 'decoration', 'status', 'help'],
    component: 'BlockTCross'
  },
  {
    slug: 'block-z-zigzag-left',
    label: 'Block z zigzag left',
    tags: ['shape', 'decoration'],
    component: 'BlockZZigzagLeft'
  },
  {
    slug: 'block-z-zigzag-right',
    label: 'Block z zigzag right',
    tags: ['shape', 'decoration'],
    component: 'BlockZZigzagRight'
  },
  {
    slug: 'block-zigzag-vertical-left',
    label: 'Block zigzag vertical left',
    tags: ['shape', 'decoration'],
    component: 'BlockZigzagVerticalLeft'
  },
  {
    slug: 'block-zigzag-vertical-right',
    label: 'Block zigzag vertical right',
    tags: ['shape', 'decoration'],
    component: 'BlockZigzagVerticalRight'
  },
  {
    slug: 'book',
    label: 'Book',
    tags: ['digital', 'communication'],
    component: 'Book'
  },
  {
    slug: 'bookmark',
    label: 'Bookmark',
    tags: ['digital', 'communication'],
    component: 'Bookmark'
  },
  {
    slug: 'bookmark-ribbon',
    label: 'Bookmark ribbon',
    tags: ['digital', 'communication'],
    component: 'BookmarkRibbon'
  },
  {
    slug: 'bow',
    label: 'Bow',
    tags: ['hospitality', 'events'],
    component: 'Bow'
  },
  {
    slug: 'bridge-arch',
    label: 'Bridge arch',
    tags: ['venue', 'place'],
    component: 'BridgeArch'
  },
  {
    slug: 'bubble-circle',
    label: 'Bubble circle',
    tags: ['shape', 'decoration', 'digital', 'communication'],
    component: 'BubbleCircle'
  },
  {
    slug: 'bubble-rotate',
    label: 'Bubble rotate',
    tags: ['digital', 'communication'],
    component: 'BubbleRotate'
  },
  {
    slug: 'bubble-smoke',
    label: 'Bubble smoke',
    tags: ['digital', 'communication'],
    component: 'BubbleSmoke'
  },
  {
    slug: 'bubble-square',
    label: 'Bubble square',
    tags: ['shape', 'decoration', 'digital', 'communication'],
    component: 'BubbleSquare'
  },
  {
    slug: 'bush',
    label: 'Bush',
    tags: ['nature', 'outdoors'],
    component: 'Bush'
  },
  {
    slug: 'cactus',
    label: 'Cactus',
    tags: ['nature', 'outdoors'],
    component: 'Cactus'
  },
  {
    slug: 'camera',
    label: 'Camera',
    tags: ['digital', 'communication'],
    component: 'Camera'
  },
  { slug: 'cat', label: 'Cat', tags: ['animals', 'fun'], component: 'Cat' },
  {
    slug: 'cd-disc-vinyl',
    label: 'Cd disc vinyl',
    tags: ['music', 'live music'],
    component: 'CdDiscVinyl'
  },
  {
    slug: 'check-correct',
    label: 'Check correct',
    tags: ['status', 'help'],
    component: 'CheckCorrect'
  },
  {
    slug: 'chestnut',
    label: 'Chestnut',
    tags: ['nature', 'outdoors'],
    component: 'Chestnut'
  },
  {
    slug: 'christmas-tree',
    label: 'Christmas tree',
    tags: ['nature', 'outdoors'],
    component: 'ChristmasTree'
  },
  {
    slug: 'circle-tube',
    label: 'Circle tube',
    tags: ['shape', 'decoration'],
    component: 'CircleTube'
  },
  {
    slug: 'circle-tube-2',
    label: 'Circle tube 2',
    tags: ['shape', 'decoration'],
    component: 'CircleTube2'
  },
  {
    slug: 'cloud',
    label: 'Cloud',
    tags: ['nature', 'outdoors'],
    component: 'Cloud'
  },
  {
    slug: 'cloud-puff',
    label: 'Cloud puff',
    tags: ['nature', 'outdoors', 'shape', 'decoration'],
    component: 'CloudPuff'
  },
  {
    slug: 'cloud-rotate',
    label: 'Cloud rotate',
    tags: ['nature', 'outdoors'],
    component: 'CloudRotate'
  },
  {
    slug: 'clover',
    label: 'Clover',
    tags: ['nature', 'outdoors'],
    component: 'Clover'
  },
  { slug: 'cow', label: 'Cow', tags: ['animals', 'fun'], component: 'Cow' },
  {
    slug: 'cowboy-hat',
    label: 'Cowboy hat',
    tags: ['entertainment', 'fun', 'animals', 'roadie'],
    component: 'CowboyHat'
  },
  {
    slug: 'crescent-moon',
    label: 'Crescent moon',
    tags: ['object'],
    component: 'CrescentMoon'
  },
  {
    slug: 'cross',
    label: 'Cross',
    tags: ['status', 'help'],
    component: 'Cross'
  },
  {
    slug: 'cross-false',
    label: 'Cross false',
    tags: ['status', 'help'],
    component: 'CrossFalse'
  },
  {
    slug: 'crown',
    label: 'Crown',
    tags: ['entertainment', 'fun'],
    component: 'Crown'
  },
  {
    slug: 'cup-coffee',
    label: 'Cup coffee',
    tags: ['hospitality', 'events'],
    component: 'CupCoffee'
  },
  {
    slug: 'cursor',
    label: 'Cursor',
    tags: ['digital', 'communication', 'roadie'],
    component: 'Cursor'
  },
  {
    slug: 'cursor-hand',
    label: 'Cursor hand',
    tags: ['digital', 'communication', 'people', 'partners'],
    component: 'CursorHead'
  },
  {
    slug: 'diamond',
    label: 'Diamond',
    tags: ['shape', 'decoration'],
    component: 'Diamond'
  },
  {
    slug: 'diamond-rhombus',
    label: 'Diamond rhombus',
    tags: ['shape', 'decoration'],
    component: 'DiamondRhombus'
  },
  {
    slug: 'diamond-shape',
    label: 'Diamond shape',
    tags: ['shape', 'decoration'],
    component: 'DiamondShape'
  },
  {
    slug: 'double-square',
    label: 'Double square',
    tags: ['shape', 'decoration'],
    component: 'DoubleSquare'
  },
  {
    slug: 'ellipse-circle',
    label: 'Ellipse circle',
    tags: ['shape', 'decoration'],
    component: 'EllipseCircle'
  },
  {
    slug: 'exclamation-mark',
    label: 'Exclamation mark',
    tags: ['status', 'help'],
    component: 'ExclamationMark'
  },
  {
    slug: 'explode',
    label: 'Explode',
    tags: ['energy', 'highlight'],
    component: 'Explode'
  },
  {
    slug: 'eye',
    label: 'Eye',
    tags: ['digital', 'communication'],
    component: 'Eye'
  },
  {
    slug: 'eye-crossed',
    label: 'Eye crossed',
    tags: ['digital', 'communication', 'status', 'help'],
    component: 'EyeCrossed'
  },
  {
    slug: 'fire',
    label: 'Fire',
    tags: ['energy', 'highlight'],
    component: 'Fire'
  },
  { slug: 'fish', label: 'Fish', tags: ['animals', 'fun'], component: 'Fish' },
  { slug: 'flag', label: 'Flag', tags: ['venue', 'place'], component: 'Flag' },
  {
    slug: 'flag-pole',
    label: 'Flag pole',
    tags: ['venue', 'place'],
    component: 'FlagPole'
  },
  {
    slug: 'flash-light',
    label: 'Flash light',
    tags: ['status', 'help'],
    component: 'FlashLight'
  },
  {
    slug: 'flower',
    label: 'Flower',
    tags: ['nature', 'outdoors'],
    component: 'Flower'
  },
  {
    slug: 'flower-abstract',
    label: 'Flower abstract',
    tags: ['nature', 'outdoors', 'shape', 'decoration'],
    component: 'FlowerAbstract'
  },
  {
    slug: 'flower-bloom',
    label: 'Flower bloom',
    tags: ['nature', 'outdoors'],
    component: 'FlowerBloom'
  },
  {
    slug: 'flower-bloom-asterisk',
    label: 'Flower bloom asterisk',
    tags: ['nature', 'outdoors'],
    component: 'FlowerBloomAsterisk'
  },
  {
    slug: 'flower-cross',
    label: 'Flower cross',
    tags: ['nature', 'outdoors', 'status', 'help'],
    component: 'FlowerCross'
  },
  {
    slug: 'flower-cute',
    label: 'Flower cute',
    tags: ['nature', 'outdoors'],
    component: 'FlowerCute'
  },
  {
    slug: 'flower-rotate',
    label: 'Flower rotate',
    tags: ['nature', 'outdoors'],
    component: 'FlowerRotate'
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
    tags: ['nature', 'outdoors', 'energy', 'highlight'],
    component: 'FlowerStar'
  },
  {
    slug: 'flower-tulip',
    label: 'Flower tulip',
    tags: ['nature', 'outdoors'],
    component: 'FlowerTulip'
  },
  {
    slug: 'football',
    label: 'Football',
    tags: ['entertainment', 'fun', 'roadie'],
    component: 'Football'
  },
  {
    slug: 'ghost',
    label: 'Ghost',
    tags: ['entertainment', 'fun'],
    component: 'Ghost'
  },
  {
    slug: 'globe-world',
    label: 'Globe world',
    tags: ['venue', 'place'],
    component: 'GlobeWorld'
  },
  {
    slug: 'grass',
    label: 'Grass',
    tags: ['nature', 'outdoors'],
    component: 'Grass'
  },
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
  {
    slug: 'heart-pixel',
    label: 'Heart pixel',
    tags: ['people', 'partners'],
    component: 'HeartPixel'
  },
  {
    slug: 'hexagon',
    label: 'Hexagon',
    tags: ['shape', 'decoration'],
    component: 'Hexagon'
  },
  {
    slug: 'high-five',
    label: 'High five',
    tags: ['people', 'partners', 'roadie'],
    component: 'HighFive'
  },
  {
    slug: 'house-pentagon',
    label: 'House pentagon',
    tags: ['venue', 'place', 'shape', 'decoration'],
    component: 'HousePentagon'
  },
  {
    slug: 'l-shape',
    label: 'L shape',
    tags: ['shape', 'decoration'],
    component: 'LShape'
  },
  {
    slug: 'leaf',
    label: 'Leaf',
    tags: ['nature', 'outdoors'],
    component: 'Leaf'
  },
  {
    slug: 'leaf-tree',
    label: 'Leaf tree',
    tags: ['nature', 'outdoors'],
    component: 'LeafTree'
  },
  {
    slug: 'letter-a',
    label: 'Letter a',
    tags: ['letter', 'type'],
    component: 'LetterA'
  },
  {
    slug: 'letter-d',
    label: 'Letter d',
    tags: ['letter', 'type'],
    component: 'LetterD'
  },
  {
    slug: 'letter-e',
    label: 'Letter e',
    tags: ['letter', 'type'],
    component: 'LetterE'
  },
  {
    slug: 'letter-h',
    label: 'Letter h',
    tags: ['letter', 'type'],
    component: 'LetterH'
  },
  {
    slug: 'letter-i',
    label: 'Letter i',
    tags: ['letter', 'type'],
    component: 'LetterI'
  },
  {
    slug: 'letter-l',
    label: 'Letter l',
    tags: ['letter', 'type'],
    component: 'LetterL'
  },
  {
    slug: 'letter-n',
    label: 'Letter n',
    tags: ['letter', 'type'],
    component: 'LetterN'
  },
  {
    slug: 'letter-p',
    label: 'Letter p',
    tags: ['letter', 'type'],
    component: 'LetterP'
  },
  {
    slug: 'letter-q',
    label: 'Letter q',
    tags: ['letter', 'type'],
    component: 'LetterQ'
  },
  {
    slug: 'letter-r',
    label: 'Letter r',
    tags: ['letter', 'type'],
    component: 'LetterR'
  },
  {
    slug: 'letter-s',
    label: 'Letter s',
    tags: ['letter', 'type'],
    component: 'LetterS'
  },
  {
    slug: 'letter-t',
    label: 'Letter t',
    tags: ['letter', 'type'],
    component: 'LetterT'
  },
  {
    slug: 'letter-v',
    label: 'Letter v',
    tags: ['letter', 'type'],
    component: 'LetterV'
  },
  {
    slug: 'letter-y',
    label: 'Letter y',
    tags: ['letter', 'type'],
    component: 'LetterY'
  },
  {
    slug: 'lightning-bolt',
    label: 'Lightning bolt',
    tags: ['energy', 'highlight'],
    component: 'LightningBolt'
  },
  {
    slug: 'magnet',
    label: 'Magnet',
    tags: ['status', 'help'],
    component: 'Magnet'
  },
  {
    slug: 'magnify-glass',
    label: 'Magnify glass',
    tags: ['digital', 'communication'],
    component: 'MagnifyGlass'
  },
  {
    slug: 'mail',
    label: 'Mail',
    tags: ['digital', 'communication'],
    component: 'Mail'
  },
  {
    slug: 'map-pin',
    label: 'Map pin',
    tags: ['venue', 'place', 'roadie'],
    component: 'MapPin'
  },
  {
    slug: 'mobile-phone',
    label: 'Mobile phone',
    tags: ['digital', 'communication'],
    component: 'MobilePhone'
  },
  {
    slug: 'money-cash',
    label: 'Money cash',
    tags: ['money', 'sales'],
    component: 'MoneyCash'
  },
  {
    slug: 'mountain',
    label: 'Mountain',
    tags: ['venue', 'place'],
    component: 'Mountain'
  },
  {
    slug: 'note',
    label: 'Note',
    tags: ['music', 'live music'],
    component: 'Note'
  },
  {
    slug: 'note-eighth-music',
    label: 'Note eighth music',
    tags: ['music', 'live music'],
    component: 'NoteEighthMusic'
  },
  {
    slug: 'note-half-music',
    label: 'Note half music',
    tags: ['music', 'live music'],
    component: 'NoteHalfMusic'
  },
  {
    slug: 'note-music',
    label: 'Note music',
    tags: ['music', 'live music', 'roadie'],
    component: 'NoteMusic'
  },
  {
    slug: 'number-0-zero',
    label: 'Number 0 zero',
    tags: ['number', 'count'],
    component: 'Number0'
  },
  {
    slug: 'number-1-one',
    label: 'Number 1 one',
    tags: ['number', 'count'],
    component: 'Number1'
  },
  {
    slug: 'number-2-two',
    label: 'Number 2 two',
    tags: ['number', 'count'],
    component: 'Number2'
  },
  {
    slug: 'number-3-three',
    label: 'Number 3 three',
    tags: ['number', 'count'],
    component: 'Number3'
  },
  {
    slug: 'number-4-four',
    label: 'Number 4 four',
    tags: ['number', 'count'],
    component: 'Number4'
  },
  {
    slug: 'number-5-five',
    label: 'Number 5 five',
    tags: ['number', 'count'],
    component: 'Number5'
  },
  {
    slug: 'number-6-six',
    label: 'Number 6 six',
    tags: ['number', 'count'],
    component: 'Number6'
  },
  {
    slug: 'number-7-seven',
    label: 'Number 7 seven',
    tags: ['number', 'count'],
    component: 'Number7'
  },
  {
    slug: 'number-8-eight',
    label: 'Number 8 eight',
    tags: ['number', 'count'],
    component: 'Number8'
  },
  {
    slug: 'number-9-nine',
    label: 'Number 9 nine',
    tags: ['number', 'count'],
    component: 'Number9'
  },
  {
    slug: 'octagon',
    label: 'Octagon',
    tags: ['shape', 'decoration'],
    component: 'Octagon'
  },
  { slug: 'partnership', label: 'Partnership', tags: ['people', 'partners'] },
  {
    slug: 'peanut-1',
    label: 'Peanut 1',
    tags: ['shape', 'decoration'],
    component: 'Peanut1'
  },
  {
    slug: 'peanut-2',
    label: 'Peanut 2',
    tags: ['shape', 'decoration'],
    component: 'Peanut2'
  },
  {
    slug: 'pencil',
    label: 'Pencil',
    tags: ['digital', 'communication'],
    component: 'Pencil'
  },
  {
    slug: 'pentagon',
    label: 'Pentagon',
    tags: ['shape', 'decoration'],
    component: 'Pentagon'
  },
  {
    slug: 'pie-chart',
    label: 'Pie chart',
    tags: ['growth', 'reporting'],
    component: 'PieChart'
  },
  {
    slug: 'pie-slice',
    label: 'Pie slice',
    tags: ['growth', 'reporting'],
    component: 'PieSlice'
  },
  {
    slug: 'piece-cake',
    label: 'Piece cake',
    tags: ['hospitality', 'events'],
    component: 'PieceCake'
  },
  {
    slug: 'piece-cake-square',
    label: 'Piece cake square',
    tags: ['shape', 'decoration', 'hospitality', 'events'],
    component: 'PieceCakeSquare'
  },
  {
    slug: 'pine-cones',
    label: 'Pine cones',
    tags: ['nature', 'outdoors'],
    component: 'PineCones'
  },
  {
    slug: 'pixel-cross-joy-stick',
    label: 'Pixel cross joy stick',
    tags: ['entertainment', 'fun', 'status', 'help'],
    component: 'PixelCrossJoyStick'
  },
  {
    slug: 'puzzle-cube',
    label: 'Puzzle cube',
    tags: ['entertainment', 'fun'],
    component: 'PuzzleCube'
  },
  {
    slug: 'quarter-circle',
    label: 'Quarter circle',
    tags: ['shape', 'decoration'],
    component: 'QuarterCircle'
  },
  {
    slug: 'question-mark',
    label: 'Question mark',
    tags: ['status', 'help'],
    component: 'QuestionMark'
  },
  {
    slug: 'rainbow',
    label: 'Rainbow',
    tags: ['growth', 'reporting'],
    component: 'Rainbow'
  },
  {
    slug: 'rock',
    label: 'Rock',
    tags: ['nature', 'outdoors'],
    component: 'Rock'
  },
  {
    slug: 's-line',
    label: 'S line',
    tags: ['shape', 'decoration'],
    component: 'SLine'
  },
  {
    slug: 'sand-glass',
    label: 'Sand glass',
    tags: ['status', 'help'],
    component: 'SandGlass'
  },
  {
    slug: 'shrub',
    label: 'Shrub',
    tags: ['nature', 'outdoors'],
    component: 'Shrub'
  },
  {
    slug: 'shuriken-star-spiral',
    label: 'Shuriken star spiral',
    tags: ['energy', 'highlight'],
    component: 'ShurikenStarSpiral'
  },
  { slug: 'sign', label: 'Sign', tags: ['venue', 'place'], component: 'Sign' },
  {
    slug: 'sparkling-glitter-star',
    label: 'Sparkling glitter star',
    tags: ['energy', 'highlight'],
    component: 'SparklingGlitterStar'
  },
  {
    slug: 'sparkling-glitter-star-rotate',
    label: 'Sparkling glitter star rotate',
    tags: ['energy', 'highlight'],
    component: 'SparklingGlitterStarRotate'
  },
  {
    slug: 'sparkling-glitter-wink',
    label: 'Sparkling glitter wink',
    tags: ['energy', 'highlight'],
    component: 'SparklingGlitterWink'
  },
  {
    slug: 'sponge',
    label: 'Sponge',
    tags: ['status', 'help'],
    component: 'Sponge'
  },
  {
    slug: 'square-cube-box',
    label: 'Square cube box',
    tags: ['shape', 'decoration'],
    component: 'SquareCubeBox'
  },
  {
    slug: 'stamp-frame',
    label: 'Stamp frame',
    tags: ['shape', 'decoration'],
    component: 'StampFrame'
  },
  {
    slug: 'star',
    label: 'Star',
    tags: ['energy', 'highlight'],
    component: 'Star'
  },
  {
    slug: 'star-rotate',
    label: 'Star rotate',
    tags: ['energy', 'highlight'],
    component: 'StarRotate'
  },
  {
    slug: 'sticker-circle',
    label: 'Sticker circle',
    tags: ['shape', 'decoration'],
    component: 'StickerCircle'
  },
  { slug: 'sun', label: 'Sun', tags: ['nature', 'outdoors'], component: 'Sun' },
  {
    slug: 'tape-cassette-music',
    label: 'Tape cassette music',
    tags: ['music', 'live music'],
    component: 'TapeCassetteMusic'
  },
  {
    slug: 'ticket',
    label: 'Ticket',
    tags: ['tickets', 'events', 'roadie'],
    component: 'Ticket'
  },
  {
    slug: 'ticket-side',
    label: 'Ticket side',
    tags: ['tickets', 'events'],
    component: 'TicketSide'
  },
  {
    slug: 'ticket-tag',
    label: 'Ticket tag',
    tags: ['tickets', 'events'],
    component: 'TicketTag'
  },
  {
    slug: 'triangle-prism',
    label: 'Triangle prism',
    tags: ['shape', 'decoration'],
    component: 'TrianglePrism'
  },
  {
    slug: 'triple-semi-circle',
    label: 'Triple semi circle',
    tags: ['shape', 'decoration'],
    component: 'TripleSemiCircle'
  },
  {
    slug: 'vase',
    label: 'Vase',
    tags: ['hospitality', 'events'],
    component: 'Vase'
  },
  {
    slug: 'washi-tape',
    label: 'Washi tape',
    tags: ['shape', 'decoration'],
    component: 'WashiTape'
  },
  {
    slug: 'web-page',
    label: 'Web page',
    tags: ['digital', 'communication'],
    component: 'WebPage'
  },
  {
    slug: 'wine-glass',
    label: 'Wine glass',
    tags: ['hospitality', 'events', 'roadie'],
    component: 'WineGlass'
  },
  { slug: 'wing', label: 'Wing', tags: ['animals', 'fun'], component: 'Wing' }
]
