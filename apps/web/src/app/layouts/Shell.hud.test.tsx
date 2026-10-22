import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { IMMERSIVE, mockViewport, resetViewport, SPLIT } from '../../test/viewport'
import { IDLE_SCENE } from '../../screens/idleScene'
import { DesktopShell } from './DesktopShell'
import { MobileShell } from './MobileShell'
import type { ScreenKey, ShellProps } from './shell.types'

afterEach(resetViewport)

describe.each([
  ['MobileShell', MobileShell],
  ['DesktopShell', DesktopShell],
])('%s hud slot', (_name, Shell) => {
  it('renders the hud inside the scene wrapper, not in the content', () => {
    const { getByText, container } = renderWithI18n(
      <MemoryRouter>
        <Shell scene={IDLE_SCENE} screen="play" hud={<span>hud-chip</span>}>
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
        <Shell scene={IDLE_SCENE} screen="duel" hud={<span>strip</span>} hudAt="bottom">
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

  it('desktop immersive: bottom-left of the full-bleed scene, outside the scene box and the column', () => {
    mockViewport(...IMMERSIVE)
    const { getByText } = render(DesktopShell)
    const wrapper = getByText('strip').parentElement as HTMLElement
    expect(wrapper).toHaveClass('dk-strip')
    expect(wrapper.parentElement).toHaveClass('dk')
    expect(wrapper.closest('.dk-scene')).toBeNull()
    expect(wrapper.closest('main')).toBeNull()
  })

  it('desktop split: inside the scene card', () => {
    mockViewport(...SPLIT)
    const { getByText } = render(DesktopShell)
    const wrapper = getByText('strip').parentElement as HTMLElement
    expect(wrapper).toHaveClass('dk-strip')
    expect(wrapper.closest('.dk-scene')).not.toBeNull()
    expect(wrapper.closest('main')).toBeNull()
  })
})

describe('DesktopShell modes', () => {
  function shell(props: Partial<ShellProps> & { screen: ScreenKey }) {
    const { container, unmount } = renderWithI18n(
      <MemoryRouter>
        <DesktopShell scene={IDLE_SCENE} {...props}>
          <p>content</p>
        </DesktopShell>
      </MemoryRouter>,
    )
    const root = container.querySelector('.dk') as HTMLElement
    const out = {
      root: root.className,
      mode: root.dataset['mode'],
      scene: root.querySelector(':scope > .dk-scene') as HTMLElement,
      header: root.querySelector(':scope > header.dk-header'),
      hud: root.querySelector('.dk-hud'),
      main: root.querySelector(':scope > main.dk-col') as HTMLElement,
    }
    unmount()
    return out
  }

  it('immersive from 820px of height: dk-imm + sc-<screen>, the scene and the column are root children', () => {
    mockViewport(...IMMERSIVE)
    const d = shell({ screen: 'play' })
    expect(d.root).toBe('dk dk-imm sc-play')
    expect(d.mode).toBe('immersive')
    expect(d.scene).not.toBeNull()
    expect(d.header).not.toBeNull()
    expect(d.main).toHaveTextContent('content')
  })

  it('split below 820px: dk-split', () => {
    mockViewport(...SPLIT)
    expect(shell({ screen: 'play' }).root).toBe('dk dk-split sc-play')
    expect(shell({ screen: 'board' }).mode).toBe('split')
  })

  it.each<ScreenKey>(['login', 'rules', 'play', 'result', 'board', 'profile', 'new', 'duel'])(
    'carries the screen key %s on the root for the per-screen column widths',
    (screen) => {
      mockViewport(...SPLIT)
      expect(shell({ screen }).root).toContain(`sc-${screen}`)
    },
  )

  it('the scene is the wide pasture, not the phone one', () => {
    mockViewport(...IMMERSIVE)
    const d = shell({ screen: 'rules' })
    expect(d.scene.querySelector('svg')).toHaveAttribute('viewBox', '80 0 1440 900')
    mockViewport(...SPLIT)
    expect(shell({ screen: 'rules' }).scene.querySelector('svg')).toHaveAttribute('viewBox', '200 200 1160 700')
  })

  it('immersive: the top hud is shown only over the game', () => {
    mockViewport(...IMMERSIVE)
    expect(shell({ screen: 'play', hud: <span>chips</span> }).hud).not.toBeNull()
    expect(shell({ screen: 'board', hud: <span>chips</span> }).hud).toBeNull()
  })

  it('split: the hud sits over the scene card on every screen that has one', () => {
    mockViewport(...SPLIT)
    expect(shell({ screen: 'play', hud: <span>chips</span> }).hud).not.toBeNull()
    expect(shell({ screen: 'board' }).hud).toBeNull()
  })
})

describe('MobileShell frame', () => {
  const classes = (props: { bare?: boolean; panelTop?: number; fit?: boolean }) => {
    const { container, unmount } = renderWithI18n(
      <MemoryRouter>
        <MobileShell scene={IDLE_SCENE} screen="play" {...props}>
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
