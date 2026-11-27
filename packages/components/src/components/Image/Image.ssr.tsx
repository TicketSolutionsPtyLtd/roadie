import { Image } from '.'

const pixel =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

export const Sized = () => (
  <Image src={pixel} alt='Event artwork' width={400} height={300} />
)
