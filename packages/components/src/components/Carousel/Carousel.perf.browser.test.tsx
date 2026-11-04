import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Carousel } from '.'
import roadieCss from '../../../vitest.browser.css?inline'

setupFrameTests({ css: roadieCss })

const SHOWS = Array.from({ length: 12 }, (_, index) => ({
  title: `The Rolling Kazoos, night ${index + 1}`,
  venue: 'Kazoo Hollow Room, Brisbane',
  date: `Fri ${index + 3} Sep`
}))

function ShowCarousel() {
  return (
    <div style={{ width: 960 }}>
      <Carousel aria-label='Upcoming shows'>
        <Carousel.Header>
          <Carousel.Title>Upcoming shows</Carousel.Title>
          <Carousel.Dots />
          <Carousel.Controls>
            <Carousel.Previous />
            <Carousel.Next />
          </Carousel.Controls>
        </Carousel.Header>
        <Carousel.Content overflow='hidden'>
          {SHOWS.map((show) => (
            <Carousel.Item key={show.title} className='basis-1/3'>
              <article className='grid emphasis-raised gap-2 rounded-xl p-4'>
                <div className='aspect-video rounded-lg emphasis-subtle' />
                <h3 className='text-display-ui-5'>{show.title}</h3>
                <p className='text-sm text-subtle'>
                  {show.venue} · {show.date}
                </p>
              </article>
            </Carousel.Item>
          ))}
        </Carousel.Content>
      </Carousel>
    </div>
  )
}

const button = (root: HTMLElement, label: string) =>
  root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!

describe('Carousel moves at 60fps on a slowed CPU', () => {
  it('slides on with Next, back with Previous, and to a dot', async () => {
    const root = await mount(<ShowCarousel />, { frames: 10 })
    for (const [scenario, label] of [
      ['Next', 'Next slide'],
      ['Previous', 'Previous slide'],
      ['a dot', 'Go to slide 3']
    ] as const) {
      await expectFrameBudget(
        `Carousel, ${scenario}`,
        await measureFrames(
          (index) => index === 0 && button(root, label).click(),
          { frames: 60 }
        )
      )
    }
  })
})
