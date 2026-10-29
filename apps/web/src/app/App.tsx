import { useEffect, useRef } from 'react'
import { RouterProvider } from 'react-router'
import { BadgeToastHost } from '../features/badges/BadgeToastHost'
import { OnboardingHost } from '../features/onboarding/Onboarding'
import { openOnFirstVisit } from '../features/onboarding/store'
import { UnlockHost } from '../features/pasture/UnlockHost'
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

/** The tour opens once per device, on whatever page the visitor lands first (not over legal pages). */
function useFirstVisitTour() {
  useEffect(() => openOnFirstVisit(window.location.pathname), [])
}

export function App() {
  useShareLanding()
  useFirstVisitTour()
  return (
    <Providers>
      <OfflineBanner />
      <RouterProvider router={router} />
      <BadgeToastHost />
      <UnlockHost onOpenPasture={() => void router.navigate('/profile/pasture')} />
      <OnboardingHost />
    </Providers>
  )
}
