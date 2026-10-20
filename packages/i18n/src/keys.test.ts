import { describe, expect, it } from 'vitest'
import { DEFAULT_NS, LANGS, resources, type TranslationKey } from './index'

type Tree = { readonly [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) }
  }, {})
}

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort()

const bg = flatten(resources.bg.translation)
const en = flatten(resources.en.translation)

const SERVER_ERRORS = [
  'ERR_AUTH', 'ERR_GUEST', 'ERR_INPUT', 'ERR_CODE', 'ERR_NOT_FOUND', 'ERR_NOT_STARTED',
  'ERR_FINISHED', 'ERR_REPEAT', 'ERR_NOT_YOUR_TURN', 'ERR_USERNAME_TAKEN',
  'ERR_CREDENTIALS', 'ERR_INVITE_EXPIRED', 'ERR_ROOM_FULL', 'ERR_RATE_LIMIT', 'ERR_INTERNAL',
]

describe('translation resources', () => {
  it('exposes both languages in the default namespace', () => {
    expect(LANGS).toEqual(['bg', 'en'])
    expect(DEFAULT_NS).toBe('translation')
  })

  it('has identical key sets in bg and en', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(bg).sort())
  })

  it('has no empty values', () => {
    for (const [lang, flat] of [['bg', bg], ['en', en]] as const) {
      for (const [key, value] of Object.entries(flat)) {
        expect(value.trim(), `${lang}:${key}`).not.toBe('')
      }
    }
  })

  it('pairs every _one key with an _other key', () => {
    for (const flat of [bg, en]) {
      for (const key of Object.keys(flat).filter((k) => k.endsWith('_one'))) {
        expect(flat, key).toHaveProperty(key.replace(/_one$/, '_other'))
      }
    }
  })

  it('uses the same interpolation placeholders in bg and en', () => {
    for (const [key, value] of Object.entries(bg)) {
      expect(placeholders(en[key] ?? ''), key).toEqual(placeholders(value))
    }
  })

  it('has a message for every server error code', () => {
    for (const code of [...SERVER_ERRORS, 'network', 'unknown']) {
      expect(bg, code).toHaveProperty(`error.${code}`)
    }
  })

  it('defines every rank and badge', () => {
    for (const rank of ['calf', 'herdsman', 'shepherd', 'pastor', 'steward', 'chiefBull']) {
      expect(bg).toHaveProperty(`rank.${rank}`)
    }
    for (const badge of ['firstBull', 'noWaste', 'underMinute', 'streak7', 'chiefBull', 'fiveDigits']) {
      expect(bg).toHaveProperty(`badge.${badge}.name`)
      expect(bg).toHaveProperty(`badge.${badge}.desc`)
    }
  })
})

describe('TranslationKey', () => {
  it('accepts real keys and collapses plural variants', () => {
    const keys: TranslationKey[] = ['error.ERR_CODE', 'common.bull', 'rank.calf', 'duel.found.title.bot']
    expect(keys).toHaveLength(4)
    // @ts-expect-error unknown key must not type-check
    const bad: TranslationKey = 'nope.missing'
    expect(bad).toBe('nope.missing')
  })
})
