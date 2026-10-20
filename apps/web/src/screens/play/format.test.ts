import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { errorText, formatClock } from './format'

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [59, '00:59'],
    [61, '01:01'],
    [3599, '59:59'],
  ])('%i s -> %s', (s, out) => expect(formatClock(s)).toBe(out))
})

describe('errorText', () => {
  const t = i18n.getFixedT('bg')
  it('translates local and server codes', () => {
    expect(errorText(t, null, 4, '')).toBe('')
    expect(errorText(t, 'LEN', 4, '12')).toBe('Трябват 4 различни цифри')
    expect(errorText(t, 'REPEAT', 4, '1234')).toBe('Вече пробва 1234')
    expect(errorText(t, 'ERR_FINISHED', 4, '')).toBe('Тази игра вече приключи.')
    expect(errorText(t, 'NETWORK', 4, '')).toBe('Няма връзка. Провери интернета и опитай пак.')
  })
})
