const SOFIA_TZ = 'Europe/Sofia'
const DAY_MS = 86_400_000

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SOFIA_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  weekday: 'short',
})

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface LocalParts {
  readonly wallMs: number
  readonly weekday: number
}

/** Sofia wall-clock time of `ms` expressed as if it were UTC, plus the ISO weekday (0 = Monday). */
function local(ms: number): LocalParts {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  )
  const n = (key: string) => Number(parts[key])
  const wallMs = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'))
  return { wallMs, weekday: WEEKDAYS.indexOf(parts.weekday ?? '') }
}

const offsetAt = (ms: number): number => local(ms).wallMs - (ms - (ms % 1000))

/** Monday 00:00 Europe/Sofia of the ISO week containing `nowMs`, in Unix ms. */
export function sofiaWeekStart(nowMs: number): number {
  const { wallMs, weekday } = local(nowMs)
  const mondayWall = wallMs - (wallMs % DAY_MS) - weekday * DAY_MS
  const guess = mondayWall - offsetAt(nowMs)
  // The offset at Monday midnight can differ from now's (summer time switches on Sundays).
  return mondayWall - offsetAt(guess)
}
