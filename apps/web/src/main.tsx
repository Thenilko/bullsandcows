// Global stylesheets first, so the CSS modules imported by `App` come later in the bundle
// and override them by order (e.g. `.panel { bottom: 0 }` vs the shell's panel offsets).
import './styles/tokens.css'
import './styles/pasishte.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App'
import { installStaleChunkReload } from './app/staleChunk'

// Production only (devOptions.enabled is false): the new worker activates straight away and the page reloads.
registerSW({ immediate: true })
// A lazy route whose chunk belongs to an older deploy reloads the page once instead of failing.
installStaleChunkReload()

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
