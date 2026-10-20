import { DesktopShell } from '../app/layouts/DesktopShell'
import { MobileShell } from '../app/layouts/MobileShell'
import { Card, Cta, Inset } from '../components/ui'
import { PLAY_SCENE } from './sceneStates'

function Placeholder() {
  return (
    <>
      <Card style={{ padding: 16 }}>Placeholder card</Card>
      <Inset style={{ padding: 12 }}>Placeholder inset</Inset>
      <Cta>Placeholder CTA</Cta>
    </>
  )
}

export const MobileShellScreen = () => (
  <MobileShell scene={PLAY_SCENE}>
    <Placeholder />
  </MobileShell>
)

export const DesktopShellScreen = () => (
  <DesktopShell scene={PLAY_SCENE}>
    <Placeholder />
  </DesktopShell>
)
