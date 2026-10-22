import { useIsDesktop } from '../../hooks/useIsDesktop'
import { DesktopShell } from './DesktopShell'
import { MobileShell } from './MobileShell'
import type { ShellProps } from './shell.types'

export type { SceneProps, ScreenKey, ShellProps } from './shell.types'

export function Shell(props: ShellProps) {
  return useIsDesktop() ? <DesktopShell {...props} /> : <MobileShell {...props} />
}
