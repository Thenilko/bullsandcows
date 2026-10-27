import type { WeeklyAwardDto, WeeklyDto, WeeklyRowDto } from '@bc/protocol'
import { FIXTURE_T0 } from './duelFixtures'

/** The gallery's frozen clock (`e2e/gallery.ts`): 20 s into the duel fixtures. */
export const WEEKLY_NOW = FIXTURE_T0 + 20_000
const HOUR_MS = 3_600_000

const row = (
  over: Partial<WeeklyRowDto> & Pick<WeeklyRowDto, 'rank' | 'username' | 'attempts'>,
): WeeklyRowDto => ({
  secs: 120,
  you: false,
  level: 12,
  rankKey: 'shepherd',
  avatarSpecies: 'cow',
  goldFrame: false,
  ...over,
})

/** Р7 / ПД9 of PasExtras: week 43 „Пет с нула“, 3д 4ч left, Мира 12th of 340 with 6 tries. */
export const weeklyFixture: WeeklyDto = {
  weekId: '2026-W43',
  week: 43,
  monday: '2026-10-19',
  sunday: '2026-10-25',
  endsAt: WEEKLY_NOW + (3 * 24 + 4) * HOUR_MS + 600_000,
  rule: { key: 'fiveZero', len: 5, zero: true, maxAttempts: 8, timeLimitSecs: null },
  xp: 300,
  best: { won: true, attempts: 6, secs: 134 },
  place: 12,
  top: [
    row({
      rank: 1,
      username: 'Деди Петко',
      attempts: 4,
      level: 31,
      rankKey: 'chiefBull',
      avatarSpecies: 'bull',
      goldFrame: true,
    }),
    row({ rank: 2, username: 'Яна', attempts: 5, level: 18, rankKey: 'pastor' }),
    row({
      rank: 3,
      username: 'Ники',
      attempts: 5,
      level: 9,
      rankKey: 'herdsman',
      avatarSpecies: 'bull',
    }),
  ],
  participants: 340,
  playedToday: false,
  today: null,
  award: null,
}

/** П8 / ПД12: week 43 over, Мира 12th of 340, +300 XP; week 44 is next. */
export const weeklyAwardFixture: WeeklyAwardDto = {
  weekId: '2026-W43',
  week: 43,
  place: 12,
  participants: 340,
  won: true,
  attempts: 6,
  secs: 134,
  xp: 300,
  goldFrame: false,
  weeksWon: 2,
}

export const weeklyNextFixture: WeeklyDto = {
  ...weeklyFixture,
  weekId: '2026-W44',
  week: 44,
  rule: { key: 'threeNoZero', len: 3, zero: false, maxAttempts: 6, timeLimitSecs: null },
  award: weeklyAwardFixture,
}
