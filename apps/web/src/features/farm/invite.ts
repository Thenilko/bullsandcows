import type { TFunction } from 'i18next'
import { publicUrl } from '../share/publicUrl'

/** `/ferma/K7Q2M`: the link in the invitation (and in the QR). */
export const farmLink = (code: string): string => `${publicUrl()}/ferma/${code}`

/** The invitation text of П3: a line about the farm, then the code and the link. */
export function inviteText(t: TFunction, code: string): string {
  return `${t('farm.created.inviteText')}\n${t('farm.created.inviteCode', { code, link: farmLink(code) })}`
}
