import { Carousel } from '.'
import { allowing } from '../../utils/hydrationTestUtils'
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

const clientOnly = { ticket: 'INNO-1675', shift: 9 }

export const TitleDotsAndControls = allowing(
  () => (
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
  ),
  { 1280: clientOnly }
)

export const DotsBelow = allowing(
  () => (
    <Carousel aria-label='Upcoming shows'>
      <Carousel.Content>{slides}</Carousel.Content>
      <Carousel.Dots />
    </Carousel>
  ),
  { 390: clientOnly, 1280: clientOnly }
)
