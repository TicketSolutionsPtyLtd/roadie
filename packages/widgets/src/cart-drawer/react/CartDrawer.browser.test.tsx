import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { describeDrawerGeometry } from '../drawerTestUtils'
import { CartDrawer } from './CartDrawer'

describeDrawerGeometry('React', (props) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>
      <CartDrawer {...props} />
    </QueryClientProvider>
  ).unmount
})
