// Global stylesheets first, so the CSS modules imported by `App` come later in the bundle
// and override them by order (e.g. `.panel { bottom: 0 }` vs the shell's panel offsets).
import './styles/tokens.css'
import './styles/pasishte.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
