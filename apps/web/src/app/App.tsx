import { useEffect, useRef } from 'react'
import { RouterProvider } from 'react-router'
import { BadgeToastHost } from '../features/badges/BadgeToastHost'
import { logShareLanding } from '../features/share/landing'
import { OfflineBanner } from './OfflineBanner'
import { Providers } from './providers'
import { router } from './router'

/** `?s=share` is reported once per page load (the ref keeps StrictMode's second effect run quiet). */
function useShareLanding() {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    logShareLanding(window.location.search)
  }, [])
}

export function App() {
  useShareLanding()
  return (
    <Providers>
      <OfflineBanner />
      <RouterProvider router={router} />
      <BadgeToastHost />
    </Providers>
  )
}
