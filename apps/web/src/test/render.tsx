import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'

/** Renders inside the app i18n instance (initialised with the detected language; tests pin `bg`). */
export function renderWithI18n(ui: ReactElement, options?: RenderOptions): RenderResult {
  void i18n.changeLanguage('bg')
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>, options)
}
