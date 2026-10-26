import { describe, expect, it } from 'vitest'
import { detectLang } from './detectLang'

describe('detectLang', () => {
  it('uses bg for a Bulgarian browser', () => expect(detectLang(null, null, 'bg-BG')).toBe('bg'))
  it('falls back to en for other browsers', () => expect(detectLang(null, null, 'en-US')).toBe('en'))
  it('prefers the stored value over the browser', () => expect(detectLang(null, 'en', 'bg')).toBe('en'))
  it('prefers the profile over everything', () => expect(detectLang('bg', 'en', 'en')).toBe('bg'))
  it('ignores an invalid stored value', () => expect(detectLang(null, 'xx', 'bg')).toBe('bg'))
})
