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

describe('MobileShell frame', () => {
  const classes = (props: { bare?: boolean; panelTop?: number; fit?: boolean }) => {
    const { container, unmount } = renderWithI18n(
      <MemoryRouter>
        <MobileShell scene={IDLE_SCENE} {...props}>
          <p>content</p>
        </MobileShell>
      </MemoryRouter>,
    )
    const root = container.firstElementChild?.firstElementChild as HTMLElement
    const out = { root: root.className, panelTop: root.style.getPropertyValue('--panel-top'), main: container.querySelector('main')?.className ?? '' }
    unmount()
    return out
  }

  it('marks bare screens (no tab bar, the panel reaches the bottom)', () => {
    expect(classes({ bare: true }).root).toMatch(/bare/)
    expect(classes({}).root).not.toMatch(/bare/)
    expect(classes({}).main).toMatch(/panelBody/)
  })

  it('marks play-like screens with their artboard panel top, and `fit` for the non-scrolling solo panel', () => {
    const band = classes({})
    expect(band.root).not.toMatch(/play/)
    expect(band.panelTop).toBe('')
    const duel = classes({ panelTop: 266 })
    expect(duel.root).toMatch(/play/)
    expect(duel.root).not.toMatch(/fit/)
    expect(duel.panelTop).toBe('266px')
    expect(classes({ panelTop: 356, fit: true }).root).toMatch(/fit/)
  })
})
