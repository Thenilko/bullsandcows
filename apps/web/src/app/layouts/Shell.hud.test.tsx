import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { IDLE_SCENE } from '../../screens/idleScene'
import { DesktopShell } from './DesktopShell'
import { MobileShell } from './MobileShell'

describe.each([
  ['MobileShell', MobileShell],
  ['DesktopShell', DesktopShell],
])('%s hud slot', (_name, Shell) => {
  it('renders the hud inside the scene wrapper, not in the content', () => {
    const { getByText, container } = renderWithI18n(
      <MemoryRouter>
        <Shell scene={IDLE_SCENE} hud={<span>hud-chip</span>}>
          <p>content</p>
        </Shell>
      </MemoryRouter>,
    )
    const hud = getByText('hud-chip')
    expect(hud.closest('main')).toBeNull()
    expect(hud.closest('div')?.parentElement?.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('main')).toHaveTextContent('content')
  })

  it('pins a bottom hud to the lower edge of the visible scene', () => {
    const { getByText } = renderWithI18n(
      <MemoryRouter>
        <Shell scene={IDLE_SCENE} hud={<span>strip</span>} hudAt="bottom">
          <p>content</p>
        </Shell>
      </MemoryRouter>,
    )
    const wrapper = getByText('strip').parentElement as HTMLElement
    expect(wrapper.style.top).toBe('')
    expect(wrapper.style.bottom).not.toBe('')
    expect(wrapper.style.position).toBe('absolute')
  })
})

describe('MobileShell panel', () => {
  const panel = (bare: boolean) => {
    const { container, unmount } = renderWithI18n(
      <MemoryRouter>
        <MobileShell scene={IDLE_SCENE} bare={bare}>
          <p>content</p>
        </MobileShell>
      </MemoryRouter>,
    )
    const cls = container.querySelector('main')?.className ?? ''
    unmount()
    return cls
  }

  it('reaches the bottom on bare screens and stops above the tab bar otherwise', () => {
    expect(panel(true)).toMatch(/panelBare/)
    expect(panel(false)).not.toMatch(/panelBare/)
    expect(panel(false)).toMatch(/panelBody/)
  })
})
