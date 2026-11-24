import { Marquee } from '.'

export const Genres = () => (
  <Marquee aria-label='Genres'>
    {['Festivals', 'Concerts', 'Theatre', 'Sports'].map((genre) => (
      <p key={genre} className='rounded-full emphasis-subtle px-4 py-2'>
        {genre}
      </p>
    ))}
  </Marquee>
)
