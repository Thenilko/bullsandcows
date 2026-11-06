import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '../i18n'
import { LAST_SETUP_KEY } from '../features/setup/lastSetup'

afterEach(() => {
  cleanup()
  // Remembered setup screens must not leak from one test into the next.
  try {
    window.localStorage.removeItem(LAST_SETUP_KEY)
  } catch {
    // A test replaced storage with a failing one.
  }
})
