/**
 * Who runs the game, as shown on the legal pages and in the footer.
 *
 * TODO before release: fill in OPERATOR, ADDRESS, EIK and STORY. EMAIL comes from VITE_CONTACT_EMAIL; while
 * it is empty the footer hides „Контакт“ and the texts show the bracketed placeholder.
 */
export const SITE = {
  OPERATOR: '[Име или фирма]',
  ADDRESS: '[адрес]',
  EIK: '[ЕИК]',
  EMAIL: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
  CREATOR: 'Данаил Симеонов',
  STORY: '[Тук — твоята история: защо направи играта, за кого и кой помогна.]',
} as const

export const EMAIL_PLACEHOLDER = '[имейл за контакт]'
export const COPYRIGHT_YEAR = 2026
