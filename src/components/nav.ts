import { createContext, useContext } from 'react'
import type { TabId } from './BottomTabBar'

/** Lets a screen switch tabs (e.g. Today → Workout). Provided by App. */
export const NavContext = createContext<(tab: TabId) => void>(() => {})

export const useNav = () => useContext(NavContext)
