import { Link } from 'react-router'
import { pieces } from './fill'
import styles from './legal.module.css'

/** A paragraph of page text: placeholders filled, `[text](href)` turned into an in-app or external link. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {pieces(text).map((piece, i) => {
        if (!('href' in piece)) return <span key={i}>{piece.text}</span>
        return piece.href.startsWith('/') ? (
          <Link key={i} to={piece.href} className={styles.a}>
            {piece.text}
          </Link>
        ) : (
          <a
            key={i}
            href={piece.href}
            className={styles.a}
            target="_blank"
            rel="noopener noreferrer"
          >
            {piece.text}
          </a>
        )
      })}
    </>
  )
}
