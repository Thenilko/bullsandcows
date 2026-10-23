import { useEffect, useState } from 'react'

function readInset(): number {
  const vv = typeof window === 'undefined' ? undefined : window.visualViewport
  if (!vv) return 0
  // The on-screen keyboard shrinks the visual viewport; the layout viewport (and `dvh`) stays put on iOS.
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
}

/** Height of the on-screen keyboard (0 when closed), so fixed sheets can stay above it. */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(readInset())
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}
