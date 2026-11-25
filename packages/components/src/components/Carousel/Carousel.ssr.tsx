import { Carousel } from '.'
import { Card } from '../Card'

const slides = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((title) => (
  <Carousel.Item key={title} className='basis-[42%] md:basis-1/3'>
    <Card emphasis='subtle'>
      <Card.Content>
        <Card.Title>{title}</Card.Title>
        <Card.Description>Clockwork Wattle Brewery</Card.Description>
      </Card.Content>
    </Card>
  </Carousel.Item>
))

export const TitleDotsAndControls = () => (
  <Carousel aria-label='Upcoming shows'>
    <Carousel.Header>
      <Carousel.Title>Upcoming shows</Carousel.Title>
      <Carousel.Dots />
      <Carousel.Controls>
        <Carousel.Previous />
        <Carousel.Next />
      </Carousel.Controls>
    </Carousel.Header>
    <Carousel.Content>{slides}</Carousel.Content>
  </Carousel>
)

export const DotsBelow = () => (
  <Carousel aria-label='Upcoming shows'>
    <Carousel.Content>{slides}</Carousel.Content>
    <Carousel.Dots />
  </Carousel>
)

export const VerticalDotsBeside = () => (
  <Carousel
    aria-label='Upcoming shows'
    direction='vertical'
    className='flex gap-4'
  >
    <Carousel.Content className='h-48 flex-1'>{slides}</Carousel.Content>
    <Carousel.Dots />
  </Carousel>
)
