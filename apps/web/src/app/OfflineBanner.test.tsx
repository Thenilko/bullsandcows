import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import { OfflineBanner } from './OfflineBanner'

function setOnline(value: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OfflineBanner', () => {
  it('is hidden while online', () => {
    setOnline(true)
    renderWithI18n(<OfflineBanner />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('appears on the offline event and disappears on online', () => {
    setOnline(true)
    renderWithI18n(<OfflineBanner />)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('status')).toHaveTextContent('Няма връзка')
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows immediately when mounted offline', () => {
    setOnline(false)
    renderWithI18n(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
