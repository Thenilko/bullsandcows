import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { utf8ToBytes } from '@noble/hashes/utils.js'
import { codes, totalCodes, type Len } from './codes'

const SOFIA_TZ = 'Europe/Sofia'
const MAC_BYTES_USED = 8
const BYTE_BITS = 8n

const sofiaFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: SOFIA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar date ('YYYY-MM-DD') in Europe/Sofia; the day rolls over at 00:00 local time. */
export function sofiaDate(now: Date): string {
  return sofiaFormat.format(now)
}

/** The Sofia calendar date of the first number of the day: that day is #1. */
export const LAUNCH_DATE = '2026-10-22'
const DAY_MS = 86_400_000

const dayIndex = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)

/**
 * The number of the day shown next to the puzzle („#127“): days since `LAUNCH_DATE` in
 * Europe/Sofia plus one. A 'YYYY-MM-DD' string is taken as a Sofia date already.
 */
export function dailyNumber(date: string | Date): number {
  const sofia = typeof date === 'string' ? date : sofiaDate(date)
  return dayIndex(sofia) - dayIndex(LAUNCH_DATE) + 1
}

/** HMAC-SHA256(salt, `${date}|${len}|${zero ? 1 : 0}`); first 8 bytes, big-endian, mod total. */
export function dailyIndex(salt: string, date: string, len: Len, zero: boolean): number {
  const message = `${date}|${len}|${zero ? 1 : 0}`
  const mac = hmac(sha256, utf8ToBytes(salt), utf8ToBytes(message))
  let value = 0n
  for (let i = 0; i < MAC_BYTES_USED; i++) value = (value << BYTE_BITS) | BigInt(mac[i])
  return Number(value % BigInt(totalCodes(len, zero)))
}

export function dailySecret(salt: string, date: string, len: Len, zero: boolean): string {
  return codes(len, zero)[dailyIndex(salt, date, len, zero)]
}
