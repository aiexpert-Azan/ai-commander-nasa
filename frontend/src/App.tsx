import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, API_URL, type Health } from './api/client'
import { Starfield } from './components/Starfield'
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

  const screens = {
    welcome: <Welcome />, briefing: <Briefing />, design: <DesignScreen />, readiness: <Readiness />,
    launch: <LaunchScreen />, explore: <Exploration />, results: <Results />,
  }

  return (
    <>
      <Starfield />
      <TopBar />
      {(offline || health?.star_data_error || (health && !health.model_loaded)) && (
        <div className="fixed inset-x-0 top-14 z-30 flex justify-center px-4">
          <div className="mt-2 flex max-w-2xl items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-950/80 px-3 py-2 text-xs text-amber-100 backdrop-blur">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              {offline ? `Mission server offline (${API_URL || '/api proxy'}). Run start-backend.bat — retrying automatically.`
                : health?.star_data_error ? `Setup error: ${health.star_data_error}. No substitute signals will be shown.`
                  : 'AI Scientist offline (model not loaded). You can still play using your own analysis.'}
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
  return <GameProvider><Game /></GameProvider>
}
