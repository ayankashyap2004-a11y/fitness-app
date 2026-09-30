import { App as CapApp } from '@capacitor/app'
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import { handleBack } from './components/backStack'
import { isNative } from './platform'
import { BottomTabBar, TABS, type TabId } from './components/BottomTabBar'
import { TodayScreen } from './features/today/TodayScreen'
import { FoodScreen } from './features/food/FoodScreen'
import { OnboardingFlow } from './features/onboarding/OnboardingFlow'
import { useProfile } from './db/hooks'
import { NavContext } from './components/nav'

// Small UI preference only; all real data lives in IndexedDB.
const TAB_KEY = 'ui.lastTab'

function readLastTab(): TabId {
  try {
    const saved = localStorage.getItem(TAB_KEY)
    if (TABS.some((t) => t.id === saved)) return saved as TabId
  } catch {
    // storage unavailable: fall through to default
  }
  return 'today'
}

// Heavier tabs (uPlot charts, zip backup, workouts) load when first opened. The service
// worker precaches every chunk, so they still work offline.
const WorkoutScreen = lazy(() => import('./features/workout/WorkoutScreen').then((m) => ({ default: m.WorkoutScreen })))
const ProgressScreen = lazy(() => import('./features/progress/ProgressScreen').then((m) => ({ default: m.ProgressScreen })))
const SettingsScreen = lazy(() => import('./features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })))

const SCREENS: Record<TabId, ComponentType> = {
  today: TodayScreen,
  food: FoodScreen,
  workout: WorkoutScreen,
  progress: ProgressScreen,
  settings: SettingsScreen,
}

export default function App() {
  const [tab, setTab] = useState<TabId>(readLastTab)

  const changeTab = (next: TabId) => {
    setTab(next)
    window.scrollTo(0, 0)
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch {
      // ignore
    }
  }

  // Android Back (APK only): close the top sheet, else go to Today, else minimise.
  const tabRef = useRef(tab)
  tabRef.current = tab
  useEffect(() => {
    if (!isNative) return
    const sub = CapApp.addListener('backButton', () => {
      if (handleBack()) return
      if (tabRef.current !== 'today') changeTab('today')
      else void CapApp.minimizeApp()
    })
    return () => {
      void sub.then((s) => s.remove())
    }
    // changeTab only touches state setters and localStorage.
  }, [])

  const profile = useProfile()
  if (profile === undefined) return null
  if (profile === null) return <OnboardingFlow />

  const Screen = SCREENS[tab]

  return (
    <div className="mx-auto min-h-full max-w-md pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <main>
        <NavContext.Provider value={changeTab}>
          <Suspense fallback={null}>
            <Screen />
          </Suspense>
        </NavContext.Provider>
      </main>
      <BottomTabBar active={tab} onChange={changeTab} />
    </div>
  )
}
