// The bold weight of ten Phosphor icons, inlined so Kbd, and every Tooltip
// and Menu item that shows a shortcut, doesn't load all six weights of each.
// glyphs.test.tsx checks each one renders exactly as Phosphor's bold. The
// legal comment below keeps Phosphor's MIT notice in the built file.
import type { SVGProps } from 'react'

/*! Phosphor Icons (https://phosphoricons.com), MIT License, Copyright (c) 2020 Phosphor Icons */

export type GlyphProps = SVGProps<SVGSVGElement>

function glyph(d: string) {
  return function Glyph(props: GlyphProps) {
    return (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='1em'
        height='1em'
        fill='currentColor'
        viewBox='0 0 256 256'
        {...props}
      >
        <path d={d} />
      </svg>
    )
  }
}

export const ArrowDownGlyph = glyph(
  'M208.49,152.49l-72,72a12,12,0,0,1-17,0l-72-72a12,12,0,0,1,17-17L116,187V40a12,12,0,0,1,24,0V187l51.51-51.52a12,12,0,0,1,17,17Z'
)

export const ArrowFatUpGlyph = glyph(
  'M232.48,111.51l-96-96a12,12,0,0,0-17,0l-96,96A12,12,0,0,0,32,132H68v76a20,20,0,0,0,20,20h80a20,20,0,0,0,20-20V132h36a12,12,0,0,0,8.48-20.49ZM176,108a12,12,0,0,0-12,12v84H92V120a12,12,0,0,0-12-12H61l67-67,67,67Z'
)

export const ArrowLeftGlyph = glyph(
  'M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z'
)

export const ArrowRightGlyph = glyph(
  'M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z'
)

export const ArrowUpGlyph = glyph(
  'M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z'
)

export const BackspaceGlyph = glyph(
  'M216,36H68.53a20.09,20.09,0,0,0-17.15,9.71L5.71,121.83a12,12,0,0,0,0,12.34l45.67,76.12A20.09,20.09,0,0,0,68.53,220H216a20,20,0,0,0,20-20V56A20,20,0,0,0,216,36Zm-4,160H70.8L30,128,70.8,60H212ZM103.51,143.51,119,128l-15.52-15.51a12,12,0,0,1,17-17L136,111l15.51-15.52a12,12,0,0,1,17,17L153,128l15.52,15.51a12,12,0,0,1-17,17L136,145l-15.51,15.52a12,12,0,0,1-17-17Z'
)

export const CommandGlyph = glyph(
  'M180,140H164V116h16a40,40,0,1,0-40-40V92H116V76a40,40,0,1,0-40,40H92v24H76a40,40,0,1,0,40,40V164h24v16a40,40,0,1,0,40-40ZM164,76a16,16,0,1,1,16,16H164ZM60,76a16,16,0,0,1,32,0V92H76A16,16,0,0,1,60,76ZM92,180a16,16,0,1,1-16-16H92Zm24-64h24v24H116Zm64,80a16,16,0,0,1-16-16V164h16a16,16,0,0,1,0,32Z'
)

export const ControlGlyph = glyph(
  'M208.49,128.49a12,12,0,0,1-17,0L128,65,64.49,128.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,128.49Z'
)

export const KeyReturnGlyph = glyph(
  'M71.51,144.49a12,12,0,0,1,0-17l24-24a12,12,0,0,1,17,17L109,124h55V104a12,12,0,0,1,24,0v32a12,12,0,0,1-12,12H109l3.52,3.51a12,12,0,0,1-17,17ZM236,56V200a20,20,0,0,1-20,20H40a20,20,0,0,1-20-20V56A20,20,0,0,1,40,36H216A20,20,0,0,1,236,56Zm-24,4H44V196H212Z'
)

export const OptionGlyph = glyph(
  'M236,192a12,12,0,0,1-12,12H160.94a19.89,19.89,0,0,1-17.88-11.06L92.58,92H32a12,12,0,0,1,0-24H95.06a19.89,19.89,0,0,1,17.88,11.06L163.42,180H224A12,12,0,0,1,236,192ZM152,92h72a12,12,0,0,0,0-24H152a12,12,0,0,0,0,24Z'
)
