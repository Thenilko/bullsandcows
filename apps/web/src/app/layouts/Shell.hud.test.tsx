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

})

describe('bottom hud (the PasDuel opponent strip)', () => {
  const render = (Shell: typeof MobileShell) =>
    renderWithI18n(
      <MemoryRouter>
        <Shell scene={IDLE_SCENE} hud={<span>strip</span>} hudAt="bottom">
          <p>content</p>
        </Shell>
      </MemoryRouter>,
    )

  it('mobile: pins it to the lower edge of the visible scene', () => {
    const { getByText } = render(MobileShell)
    const wrapper = getByText('strip').parentElement as HTMLElement
    expect(wrapper.style.top).toBe('')
    expect(wrapper.className).toMatch(/hudBottom/)
  })

  it('desktop: puts it under the scene card, not over the herd', () => {
    const { getByText } = render(DesktopShell)
    const wrapper = getByText('strip').parentElement as HTMLElement
    expect(wrapper.closest('.card')).toBeNull()
    expect(wrapper.closest('main')).toBeNull()
    expect(wrapper.previousElementSibling?.querySelector('svg')).not.toBeNull()
  })
})

describe('DesktopShell columns', () => {
  const render = (props: { sceneSide?: boolean; panelCard?: boolean }) => {
    const { container, unmount } = renderWithI18n(
      <MemoryRouter>
        <DesktopShell scene={IDLE_SCENE} {...props}>
          <p>content</p>
        </DesktopShell>
      </MemoryRouter>,
    )
    const main = container.querySelector('main') as HTMLElement
    const out = { main: main.className, sceneCol: (main.previousElementSibling as HTMLElement).className }
    unmount()
    return out
  }

  it('play pages: the scene comes first and the content is bare', () => {
    const d = render({})
    expect(d.sceneCol).not.toMatch(/sceneColSide|sceneColDuel/)
    expect(d.main).not.toMatch(/card/)
  })

  it('leaderboard and profile: the scene is the narrow second column', () => {
    expect(render({ sceneSide: true }).sceneCol).toMatch(/sceneColSide/)
  })

  it('new game and duel pages: PasDuel column widths and one panel card', () => {
    const d = render({ panelCard: true })
    expect(d.sceneCol).toMatch(/sceneColDuel/)
    expect(d.sceneCol).not.toMatch(/sceneColSide/)
    expect(d.main).toMatch(/\bcard\b/)
    expect(d.main).toMatch(/panelCard/)
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
