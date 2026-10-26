import type { BarnColor, PastureKey } from '@bc/game-core'
import type { PastureDto } from '@bc/protocol'
import { useState } from 'react'
import { applyPasturePatch, togglePatch } from '../features/pasture/pastureModel'
import { UnlockModal } from '../features/pasture/UnlockModal'
import { PastureScreen } from '../screens/Pasture'
import { pastureFixture, pastureFullFixture, pastureUnlockFixture } from './pastureFixtures'

const noop = () => undefined

/** The screen with local state, so the gallery's switches and swatches work without a server. */
function Interactive({ initial }: { initial: PastureDto }) {
  const [view, setView] = useState(initial)
  const onToggle = (key: PastureKey, show: boolean) => setView((v) => applyPasturePatch(v, togglePatch(v, key, show)))
  const onColor = (barnColor: BarnColor) => setView((v) => applyPasturePatch(v, { barnColor }))
  return <PastureScreen view={view} onToggle={onToggle} onColor={onColor} />
}

/** Р6 / ПД1 / ПДН1 „Твоето пасище“. */
export const PastureGalleryScreen = () => <Interactive initial={pastureFixture} />
/** П1 / ПД2: everything unlocked, the blue barn. */
export const PastureFullScreen = () => <Interactive initial={pastureFullFixture} />

/** П2 / ПД3: „Ниво 15 · ново в пасището“ — the windmill over the pasture. */
export function UnlockScreen() {
  return (
    <>
      <PastureScreen view={pastureUnlockFixture} onToggle={noop} onColor={noop} />
      <UnlockModal item="windmill" level={15} onPut={noop} onLater={noop} />
    </>
  )
}
