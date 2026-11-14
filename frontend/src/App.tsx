import { MotionConfig } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, API_URL, type Health } from './api/client'
import { Starfield } from './components/Starfield'
import { TutorialProvider } from './components/Tutorial'
import { TopBar } from './components/ui'
import { GameProvider, useGame } from './game/store'
import { Briefing } from './screens/Briefing'
import { DesignScreen } from './screens/Design'
import { Exploration } from './screens/Exploration'
import { LaunchScreen } from './screens/Launch'
import { Readiness } from './screens/Readiness'
import { Results } from './screens/Results'
import { Welcome } from './screens/Welcome'

function Game() {
  const { state, dispatch } = useGame()
  const [health, setHealth] = useState<Health | null>(null)
  const [offline, setOffline] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const boot = () => {
      api.catalog().then((c) => { if (alive) { dispatch({ type: 'catalog', catalog: c }); setOffline(null) } })
        .catch((e: Error) => { if (alive) { setOffline(e.message); setTimeout(boot, 4000) } })
      api.health().then((h) => alive && setHealth(h)).catch(() => {})
    }
    boot()
    return () => { alive = false }
  }, [dispatch])

  // New screen starts at the top (important on phones, where the previous screen may have been scrolled).
  useEffect(() => { window.scrollTo(0, 0) }, [state.screen])

  const screens = {
    welcome: <Welcome />, briefing: <Briefing />, design: <DesignScreen />, readiness: <Readiness />,
    launch: <LaunchScreen />, explore: <Exploration />, results: <Results />,
  }

  return (
    <>
      <Starfield />
      <TopBar />
      {(offline || health?.star_data_error || (health && !health.model_loaded)) && (
        <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-30 flex justify-center px-3" role="status">
          <div className="mt-2 flex max-w-2xl items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-950/90 px-3 py-2 text-xs text-amber-100 backdrop-blur">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              {offline ? `Can't reach mission control (${API_URL || '/api proxy'}). Retrying automatically…`
                : health?.star_data_error ? `Setup error: ${health.star_data_error}. No substitute signals will be shown.`
                  : 'The AI Scientist is offline right now. You can still play using your own judgement.'}
            </span>
          </div>
        </div>
      )}
      {/* Keyed so each screen remounts with its enter animation (no exit-wait, which could stall navigation). */}
      <div key={state.screen}>{screens[state.screen]}</div>
    </>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <GameProvider><TutorialProvider><Game /></TutorialProvider></GameProvider>
    </MotionConfig>
  )
}
