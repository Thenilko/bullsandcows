import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { buildResult } from '../../screens/result/resultModel'
import { fixtureMe, fixtureState, myGuess } from '../../dev/duelFixtures'
import { fallbackDistribution, lostGame, wonGame } from '../../test/fixtures'
import { formatShareDate, shareLabels } from './shareLabels'
import { shareFromDuel, shareFromResult } from './shareModel'

const t = i18n.getFixedT('bg')
/** 2023-11-14T22:13:20Z: already the 15th in Sofia. */
const NOV_15_SOFIA = 1_700_000_000_000

describe('formatShareDate', () => {
  it('is „15 ное“ in Bulgarian (Sofia time) and the locale short form otherwise', () => {
    expect(formatShareDate(NOV_15_SOFIA, 'bg')).toBe('15 ное')
    expect(formatShareDate(NOV_15_SOFIA, 'en')).toBe('Nov 15')
  })
})

describe('shareLabels', () => {
  it('describes a daily win: number and date, attempts, time, top', () => {
    const labels = shareLabels(shareFromResult(buildResult(wonGame, fallbackDistribution)), t, 'bg')
    expect(labels.heading).toBe('Число на деня #127 · 15 ное')
    expect(labels.big).toBe('6 опита')
    expect(labels.aside).toBe('01:36')
    expect(labels.top).toBe('ТОП 37% днес')
    expect(labels.better).toBe('Можеш ли по-добре?')
  })

  it('shows „не позна“ and no top badge for a loss', () => {
    const labels = shareLabels(shareFromResult(buildResult(lostGame, fallbackDistribution)), t, 'bg')
    expect(labels.big).toBe('не позна')
    expect(labels.top).toBeNull()
  })

  it('names the free format and the duel opponent with the outcome', () => {
    const free = shareFromResult(buildResult({ ...wonGame, kind: 'free', dailyNumber: undefined }, fallbackDistribution))
    expect(shareLabels(free, t, 'bg').heading).toBe('Свободна игра · 4 цифри')
    const duel = shareFromDuel(fixtureState({ me: fixtureMe({ guesses: [myGuess('1234', 4, 0)] }) }), 'lose', 'Ани')
    const labels = shareLabels(duel, t, 'bg')
    expect(labels.heading).toBe('Дуел с Ани')
    expect(labels.big).toBe('1 опит')
    expect(labels.aside).toBe('Загуба')
    expect(labels.top).toBeNull()
  })
})
