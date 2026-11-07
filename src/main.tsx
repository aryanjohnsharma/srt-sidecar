import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LiquidGlassLogo } from './components/liquid-glass-logo'
import './styles.css'
import './app-chrome.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/service-worker.js') })
}

const App = lazy(() => import('./App'))

function Root() {
  const [minimumElapsed, setMinimumElapsed] = useState(false)
  const [appReady, setAppReady] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), 2000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!minimumElapsed || !appReady) return
    setLeaving(true)
    const timer = window.setTimeout(() => setShowSplash(false), 220)
    return () => window.clearTimeout(timer)
  }, [minimumElapsed, appReady])

  const handleAppReady = useCallback(() => {
    setAppReady(true)
  }, [])

  return <>
    <Suspense fallback={null}><App onReady={handleAppReady} /></Suspense>
    {showSplash && <div className={`loading-splash${leaving ? ' loading-splash-leaving' : ''}`} aria-hidden="true">
      <LiquidGlassLogo
        logo="/logo.svg"
        ending="logo"
        theme="light"
        style={{ height: '100dvh', width: '100vw', margin: 'auto' }}
        aria-label="SRT Sidecar"
      />
    </div>}
  </>
}

createRoot(document.getElementById('root')!).render(<Root />)
