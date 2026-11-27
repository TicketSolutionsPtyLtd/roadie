import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ImageCrop } from '.'

afterEach(() => vi.restoreAllMocks())

describe('ImageCrop', () => {
  it('renders a labelled crop area that says how to use it', () => {
    render(<ImageCrop src='/event.jpg' aspectRatio={2} label='Event image' />)
    const stage = screen.getByRole('group', { name: 'Event image' })
    expect(stage).toHaveAttribute('aria-roledescription', 'image crop')
    expect(stage).toHaveAttribute('tabindex', '0')
    expect(stage).toHaveAccessibleDescription(/arrow keys to move the image/)
  })

  it('names the crop area "Crop image" by default', () => {
    render(<ImageCrop src='/event.jpg' aspectRatio={2} />)
    expect(screen.getByRole('group', { name: 'Crop image' })).toBeVisible()
  })

  it('masks a circle but sets nothing else apart', () => {
    render(<ImageCrop src='/avatar.jpg' aspectRatio={1} shape='circle' />)
    expect(screen.getByRole('group', { name: 'Crop image' })).toHaveAttribute(
      'data-shape',
      'circle'
    )
  })

  it('shows a Blob through an object URL, revoked on unmount', () => {
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:event')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue()
    const file = new File(['x'], 'event.png', { type: 'image/png' })
    const { container, unmount } = render(
      <ImageCrop src={file} aspectRatio={2} />
    )
    expect(create).toHaveBeenCalledWith(file)
    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:event')
    unmount()
    expect(revoke).toHaveBeenCalledWith('blob:event')
  })

  it('composes a Stage with its own props', () => {
    render(
      <ImageCrop src='/event.jpg' aspectRatio={2}>
        <ImageCrop.Stage className='aspect-video' data-testid='stage' />
      </ImageCrop>
    )
    expect(screen.getByTestId('stage')).toHaveClass('aspect-video')
  })

  it('renders the controls with no children, Reset hidden until needed', () => {
    render(<ImageCrop src='/event.jpg' aspectRatio={2} />)
    const controls = screen.getByRole('group', { name: 'Crop controls' })
    for (const name of ['Zoom out', 'Zoom in', 'Rotate left'])
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    for (const name of ['Zoom', 'Straighten'])
      expect(screen.getByRole('slider', { name })).toBeInTheDocument()
    expect(controls.querySelector('[aria-label="Reset crop"]')).toHaveAttribute(
      'hidden'
    )
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('composes the controls it is given', () => {
    render(
      <ImageCrop src='/event.jpg' aspectRatio={2}>
        <ImageCrop.Stage />
        <ImageCrop.Controls>
          <ImageCrop.Rotate aria-label='Turn' />
        </ImageCrop.Controls>
      </ImageCrop>
    )
    expect(screen.getByRole('button', { name: 'Turn' })).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it.each([
    ['Stage', <ImageCrop.Stage key='part' />],
    ['Controls', <ImageCrop.Controls key='part' />],
    ['Zoom', <ImageCrop.Zoom key='part' />],
    ['Rotate', <ImageCrop.Rotate key='part' />],
    ['Straighten', <ImageCrop.Straighten key='part' />],
    ['Reset', <ImageCrop.Reset key='part' />]
  ])('throws when %s is outside ImageCrop', (part, element) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(element)).toThrow(
      `ImageCrop.${part} must be inside ImageCrop.`
    )
  })
})
