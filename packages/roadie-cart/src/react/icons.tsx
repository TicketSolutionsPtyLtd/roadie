import type { SVGProps } from 'react'

// Self-contained inline SVG icons. The website wrapped Phosphor here, but the
// shared package deliberately avoids an extra icon peer dependency — these are
// decorative glyphs (Phosphor "bold" outlines), inherit `currentColor`, and are
// sized via the `className` the caller passes. Keeping them inline means a
// React-only consumer pulls in zero icon deps.

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox='0 0 256 256'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
      {...props}
    >
      {children}
    </svg>
  )
}

export function BagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d='M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H216V200Z' />
    </Icon>
  )
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d='M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z' />
    </Icon>
  )
}

export function CalendarBlankIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d='M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V96H208V208Zm0-128H48V48H208Z' />
    </Icon>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d='M128,40a88,88,0,1,0,88,88A88.1,88.1,0,0,0,128,40Zm0,160a72,72,0,1,1,72-72A72.08,72.08,0,0,1,128,200Zm61.66-77.66a8,8,0,0,1-11.32,11.32l-56-56A8,8,0,0,1,120,72V48a8,8,0,0,1,16,0V68.69l53.66,53.65Z' />
    </Icon>
  )
}

export function MapPinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d='M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z' />
    </Icon>
  )
}
