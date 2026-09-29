# CLAUDE.md: Personal Fitness App

The full spec is in `docs/PRD.md`. Read it before starting any phase. This file holds the rules that apply to every task.

## What this is
A single-user fitness PWA for Ayan (Android, Chrome). It covers calorie and macro targets, food logging built around a hostel mess menu that changes weekly, a 5-day gym/home workout split, and progress tracking.

## Hard constraints (never break these)
- **₹0 running cost.** No backend, no database server, no paid APIs, no API keys.
- **All data lives on the device** in IndexedDB (via Dexie). Call `navigator.storage.persist()` on first launch.
- **Offline-first.** The app must fully work with no network, except for Open Food Facts search.
- **Only allowed network call:** the Open Food Facts API, for packaged food search. Cache every result locally.
- **Hosting:** static build deployed to GitHub Pages or Cloudflare Pages.
- **Single user:** no auth, accounts or sync.

## Stack
- Vite + React + TypeScript (strict mode)
- Dexie.js for IndexedDB
- vite-plugin-pwa (Workbox) for the service worker and manifest
- Tailwind CSS
- A lightweight chart library (Chart.js or uPlot)
- Vitest for tests

## Domain rules (easy to get wrong)
- **Targets:** calculate BMR with Mifflin-St Jeor, multiply by the activity factor for TDEE, then apply the goal adjustment (PRD §4.2).
- **Weight input:** use the 7-day average bodyweight, not the latest weigh-in.
- **Fat-loss intensity:** fixed deficits of −250 / −500 / −750 kcal. Muscle gain uses ×1.05 / ×1.10 / ×1.15.
- **Floor:** calorie targets never go below BMR.
- **Never add workout or cardio calories to the target.** The activity factor already covers them.
- **No progression suggestions.** Show last session's numbers only; the user decides.
- **Quantities:** every food entry uses a 0.5-step stepper, can switch between multiple units, and stays editable after saving.
- **Logging is manual first.** Never require a menu import or photo; the app must be fully usable by searching and adding dishes by hand.
- **Mess dish macros** come from `data/archetypes.json`; each dish in `data/mess-dishes.json` points to one via `archetypeId`. A dish `override` beats its archetype, and a user edit beats both. Match menu imports on `name` + `aliases`, case-insensitive. `altUnits[].factor` scales the default portion (e.g. ladle = 0.5 katori).
- **Volume counting:** fractional sets, where a direct set counts as 1 and a set for a helper muscle counts as 0.5.
- **Deloads:** every 6 completed training weeks, at half the planned sets, with a Skip button.

## Project structure
```
src/
  db/          Dexie schema + migrations (PRD §6)
  engine/      pure functions: bmr, tdee, targets, macros, volume, trends
  data/        seed JSON: archetypes.json (92), mess-dishes.json (342), exercises, split template
  features/    onboarding, today, food, workout, progress, settings
  components/  shared UI (Stepper, MacroBar, SetRow, ...)
docs/PRD.md
```
Keep `engine/` free of React and Dexie so it stays unit-testable.

## Build phases (do one per session; confirm before moving on)
1. **Scaffold:** Vite + TS + Tailwind + PWA manifest, bottom tab navigation, Dexie schema, storage persistence.
2. **Engine and onboarding:** `engine/` functions with Vitest tests, an onboarding flow, and targets shown on the Today screen.
3. **Food logging:** load `data/archetypes.json` and `data/mess-dishes.json` into Dexie on first run, search, quantity stepper, meal slots, pinned items, the Usual breakfast sheet, and the oil button.
4. **Manual dish entry + optional menu import:** logging is primarily manual: search and pick, or add a new dish (like an archetype, or with its own values). The weekly JSON menu import (format in PRD §4.3) is optional and lives in Settings; if a menu exists, its dishes show first and unmatched names get an alias/archetype pick.
5. **Open Food Facts:** search, cache results locally, and support whey entered manually from the tub label.
6. **Workout:** seed the exercise library and split, gym/home toggle, set logging with last-time display, rest timer, and rotation pointer.
7. **Deloads, cardio, weekly volume view.**
8. **Progress:** weight chart with 7-day average and target band, and progress photos (compressed to about 1080 px).
9. **Backup:** export/import as a .zip (JSON plus photos) and a 14-day reminder banner.
10. **Polish and deploy:** Lighthouse PWA check and a GitHub Pages workflow.

## Conventions
- Write tests for every function in `engine/` before wiring up the UI.
- Design for mobile first at about a 390 px width, with tap targets of at least 44 px.
- Keep seed data in JSON so values can be edited without code changes.
- Never store data in localStorage except small UI preferences.
- Run `npm run test` and `npm run build` before calling a phase done.
