import { useTranslation } from 'react-i18next'
import { Sheet } from '../components/ui/Sheet'
import { inviteText } from '../features/farm/invite'
import { ReminderCard } from '../features/farm/ReminderCard'
import type { TextShareActions } from '../features/share/useShare'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { FarmShell } from '../screens/Farm'
import { BoardSwitch } from '../screens/farm/BoardSwitch'
import { FarmCreatedView } from '../screens/farm/FarmCreatedView'
import { FarmJoinView } from '../screens/farm/FarmJoinView'
import { FarmSettingsView } from '../screens/farm/FarmSettingsView'
import { FarmView } from '../screens/farm/FarmView'
import { TodayShell, TodayView } from '../screens/Today'
import { farmCreatedFixture, farmFixture, farmOwnerFixture, nudgeFixture } from './farmFixtures'

const noop = () => undefined
const share: TextShareActions = { notice: null, share: async () => undefined, copy: async () => undefined }

function Chips({ left, right }: { left: string; right?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span className="ps-hud" style={{ fontSize: 15 }}>
        {left}
      </span>
      {right ? <span className="ps-hud">{right}</span> : null}
    </div>
  )
}

function Board() {
  return (
    <>
      <BoardSwitch value="farm" />
      <FarmView farm={farmFixture} copied={false} onCopyInvite={noop} onSettings={noop} onNudge={noop} />
    </>
  )
}

/** Р4 / ПД4 / ПДН2: the farm under „Класация“. */
export function FarmScreen() {
  const { t } = useTranslation()
  return (
    <FarmShell hud={<Chips left={t('farm.hud.board')} right={t('farm.hud.farm')} />}>
      <Board />
    </FarmShell>
  )
}

/** Р5 / ПД5: create or join; the code half typed as on the artboard. */
export function FarmJoinScreen() {
  const { t } = useTranslation()
  return (
    <FarmShell hud={<Chips left={t('farm.hud.title')} />}>
      <FarmJoinView initialCode="K7Q2" creating={false} joining={false} onCreate={noop} onJoin={noop} />
    </FarmShell>
  )
}

/** П3 (a panel) / ПД6 (a modal over the farm). */
export function FarmCreatedScreen() {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const view = <FarmCreatedView farm={farmCreatedFixture} invite={inviteText(t, farmCreatedFixture.code)} share={share} onDone={noop} />
  if (!desktop) return <FarmShell hud={<Chips left={t('farm.hud.title')} />}>{view}</FarmShell>
  return (
    <FarmShell>
      <Board />
      <Sheet label={t('farm.created.title')} onClose={noop} width={520} centered variant="card">
        {view}
      </Sheet>
    </FarmShell>
  )
}

/** П4 / ПД8: the nudge on „Игра“. */
export function FarmNudgeScreen() {
  return (
    <TodayShell number={127}>
      <TodayView number={127} len={4} nudge={nudgeFixture} onDismiss={noop} onPlay={noop} busy={false} reminder={<ReminderCard />} />
    </TodayShell>
  )
}

/** П5 / ПД7: the owner's settings. */
export function FarmSettingsScreen() {
  const { t } = useTranslation()
  return (
    <FarmShell hud={<Chips left={t('farm.settings.title')} />}>
      <FarmSettingsView farm={farmOwnerFixture} link="https://bullsandcows.nilkospace.app/ferma/K7Q2M" busy={false} onRename={noop} onNewCode={noop} onRemove={noop} onLeave={noop} />
    </FarmShell>
  )
}
