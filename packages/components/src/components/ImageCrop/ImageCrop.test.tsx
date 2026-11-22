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

  it('reports nothing before the image has loaded', () => {
    const onValueChange = vi.fn()
    render(
      <ImageCrop
        src='/event.jpg'
        aspectRatio={2}
        onValueChange={onValueChange}
      />
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('masks a circle but sets nothing else apart', () => {
    render(<ImageCrop src='/avatar.jpg' aspectRatio={1} shape='circle' />)
    expect(screen.getByRole('group')).toHaveAttribute('data-shape', 'circle')
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

  it('throws when a Stage is outside ImageCrop', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ImageCrop.Stage />)).toThrow(
      'ImageCrop.Stage must be inside ImageCrop.'
    )
  })
})
