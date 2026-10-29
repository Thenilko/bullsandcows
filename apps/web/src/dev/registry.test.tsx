import { MemoryRouter } from 'react-router'
import { waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import { devScreens } from './registry'
import { DEV_SCREEN_KEYS } from './screenKeys'

describe('devScreens', () => {
  it('keeps DEV_SCREEN_KEYS in sync with the registry', () => {
    expect([...DEV_SCREEN_KEYS].sort()).toEqual(Object.keys(devScreens).sort())
  })

  it.each(Object.entries(devScreens))('renders %s without console errors', async (_name, Screen) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderWithI18n(
      <MemoryRouter>
        <Screen />
      </MemoryRouter>,
    )
    // Lazy (duel) screens first show a loading marker; wait until the real screen has replaced it.
    await waitFor(() => expect(container.querySelector('[data-gallery-loading]')).toBeNull())
    expect(container).not.toBeEmptyDOMElement()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it.each([
    ['mobile-shell', ['/', '/board', '/profile', '/rules']],
    ['desktop-shell', ['/', '/board', '/rules']],
  ] as const)('%s lists its navigation links (desktop: the profile is the player chip)', (name, links) => {
    const Screen = devScreens[name]!
    const { container } = renderWithI18n(
      <MemoryRouter>
        <Screen />
      </MemoryRouter>,
    )
    const hrefs = Array.from(container.querySelectorAll('nav a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(links)
  })
})
