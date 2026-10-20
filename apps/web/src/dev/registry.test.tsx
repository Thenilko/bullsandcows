import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import { devScreens } from './registry'

describe('devScreens', () => {
  it.each(Object.entries(devScreens))('renders %s without console errors', (_name, Screen) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderWithI18n(
      <MemoryRouter>
        <Screen />
      </MemoryRouter>,
    )
    expect(container).not.toBeEmptyDOMElement()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
