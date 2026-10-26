import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import styles from './legal.module.css'
import { COPYRIGHT_YEAR, SITE } from './site'
import { APP_COMMIT, APP_VERSION } from './version'

const LINKS = ['privacy', 'terms', 'legal', 'changelog', 'press', 'support'] as const

function Heart() {
  return (
    <svg
      className={styles.heart}
      width="14"
      height="13"
      viewBox="0 0 14 13"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M7 12.6 5.98 11.7C2.4 8.5 0 6.36 0 3.78 0 1.66 1.66 0 3.78 0 4.98 0 6.13.56 7 1.44 7.87.56 9.02 0 10.22 0 12.34 0 14 1.66 14 3.78c0 2.58-2.4 4.72-5.98 7.93L7 12.6Z"
      />
    </svg>
  )
}

/**
 * The site footer: info-page links, the story link and the version line. It sits at the end of the login
 * page, Rules, Profile and every info page — never inside a game. `strip` is the desktop-login bar.
 */
export function SiteFooter({ variant = 'block' }: { variant?: 'block' | 'strip' }) {
  const { t } = useTranslation()
  const version = `v${APP_VERSION}${APP_COMMIT ? ` · ${APP_COMMIT}` : ''}`
  return (
    <footer className={variant === 'strip' ? `${styles.footer} ${styles.strip}` : styles.footer}>
      <nav aria-label={t('footer.area')}>
        <ul className={styles.links}>
          {LINKS.map((key) => (
            <li key={key}>
              <Link to={`/${key}`} className={styles.flink}>
                {t(`footer.links.${key}`)}
              </Link>
            </li>
          ))}
          {SITE.EMAIL ? (
            <li>
              <a href={`mailto:${SITE.EMAIL}`} className={styles.flink}>
                {t('footer.contact')}
              </a>
            </li>
          ) : null}
        </ul>
      </nav>
      <Link to="/story" className={styles.made}>
        {t('footer.madeBefore')} <Heart /> <span className={styles.srOnly}>{t('footer.love')}</span>
        {t('footer.madeAfter')}
      </Link>
      <p className={styles.meta}>
        {t('footer.meta', { year: COPYRIGHT_YEAR, creator: t('footer.creator') })} ·{' '}
        <Link to="/changelog" aria-label={t('footer.versionLabel', { version })}>
          {version}
        </Link>
      </p>
    </footer>
  )
}
