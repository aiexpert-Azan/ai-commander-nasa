import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// When embedded (e.g. the iPhone frame in the judging presentation), tell the parent page the game loaded,
// so it can tell a working live embed apart from one blocked by the browser. Sends no game data.
if (window.parent !== window) {
  try { window.parent.postMessage({ type: 'ai-commander-ready' }, '*') } catch { /* ignore */ }
}
