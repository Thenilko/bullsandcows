/**
 * Who runs the game, as shown on the legal pages and in the footer.
 * The operator is a private individual, so there is no company ID or published address. EMAIL comes from
 * VITE_CONTACT_EMAIL; while it is empty the footer hides „Контакт“ and the texts show the bracketed placeholder.
 */
export const SITE = {
  OPERATOR: 'Данаил Симеонов',
  EMAIL: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
  CREATOR: 'Данаил Симеонов',
} as const

export const EMAIL_PLACEHOLDER = '[имейл за контакт]'
export const COPYRIGHT_YEAR = 2026
