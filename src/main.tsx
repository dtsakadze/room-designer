import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CrashScreen } from './ui/CrashScreen'

// Offline and installable: the built app saves itself on the device. Not in the
// dev server, where files change all the time; a failure (private windows) is
// not worth telling anyone about.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const register = () => void navigator.serviceWorker.register('./sw.js').catch(() => {})
  // After the page has loaded, so saving the files doesn't slow the first visit.
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashScreen>
      <App />
    </CrashScreen>
  </StrictMode>,
)
