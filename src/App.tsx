import { useState, type JSX } from 'react'
import { BottomTabBar, TABS, type TabId } from './components/BottomTabBar'
import { TodayScreen } from './features/today/TodayScreen'
import { FoodScreen } from './features/food/FoodScreen'
import { WorkoutScreen } from './features/workout/WorkoutScreen'
import { ProgressScreen } from './features/progress/ProgressScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
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

const SCREENS: Record<TabId, () => JSX.Element | null> = {
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

  const profile = useProfile()
  if (profile === undefined) return null
  if (profile === null) return <OnboardingFlow />

  const Screen = SCREENS[tab]

  return (
    <div className="mx-auto min-h-full max-w-md pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <main>
        <NavContext.Provider value={changeTab}>
          <Screen />
        </NavContext.Provider>
      </main>
      <BottomTabBar active={tab} onChange={changeTab} />
    </div>
  )
}
