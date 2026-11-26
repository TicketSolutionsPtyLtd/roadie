import { createApp } from 'vue'

import { describeDrawerGeometry } from '../drawerTestUtils'
import CartDrawer from './CartDrawer.vue'

// @testing-library/vue reads `process.env`, which a browser doesn't have.
describeDrawerGeometry('Vue', (props) => {
  const host = document.body.appendChild(document.createElement('div'))
  const app = createApp(CartDrawer, props)
  app.mount(host)
  return () => {
    app.unmount()
    host.remove()
  }
})
