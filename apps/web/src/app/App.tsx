import { RouterProvider } from 'react-router'
import { OfflineBanner } from './OfflineBanner'
import { Providers } from './providers'
import { router } from './router'

export function App() {
  return (
    <Providers>
      <OfflineBanner />
      <RouterProvider router={router} />
    </Providers>
  )
}
