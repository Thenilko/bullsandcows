import type { WeeklyDto } from '@bc/protocol'
import { useNavigate } from 'react-router'
import { sfx } from '../../lib/sound'
import { WeeklyAwardModal } from '../../screens/weekly/WeeklyAwardModal'
import { useSeenAward } from './useWeekly'

/** П8 / ПД12 on the first visit after a week was finalised; either button marks it seen. */
export function AwardHost({ week }: { week: WeeklyDto | undefined }) {
  const navigate = useNavigate()
  const seen = useSeenAward()
  const award = week?.award
  if (!week || !award) return null
  const done = (to: string) => {
    sfx.play('tap')
    seen.mutate()
    void navigate(to)
  }
  return (
    <WeeklyAwardModal
      award={award}
      next={{ week: week.week, rule: week.rule.key }}
      onNext={() => done('/weekly')}
      onBoard={() => done(`/weekly/board/${award.weekId}`)}
    />
  )
}
