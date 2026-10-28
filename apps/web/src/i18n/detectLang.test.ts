import { describe, expect, it } from 'vitest'
import { detectLang } from './detectLang'

describe('detectLang', () => {
  it('defaults to bg when nothing is chosen', () => expect(detectLang(null, null)).toBe('bg'))
  it('prefers the stored value', () => expect(detectLang(null, 'en')).toBe('en'))
  it('prefers the profile over everything', () => expect(detectLang('bg', 'en')).toBe('bg'))
  it('ignores an invalid stored value', () => expect(detectLang(null, 'xx')).toBe('bg'))
})
