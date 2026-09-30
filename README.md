# Fitness

A personal fitness app for Android: calorie and macro targets, food logging built around a hostel mess menu, a 5-day gym/home workout split, and progress tracking. It's an installable web app (PWA): no account, no server, and all data stays on the phone.

## Install on Android

1. Open the app's GitHub Pages link in **Chrome**.
2. Tap **Install app** (or ⋮ → **Add to Home screen**).
3. Open it from the home screen. It runs full screen and works offline.

Your data lives only on the phone. Use **Settings → Backup → Export .zip** regularly, especially before clearing Chrome data or changing phones.

## Development

```bash
npm install
npm run dev      # local dev server
npm run test     # Vitest
npm run build    # production build in dist/
npm run preview  # serve the production build
```

Stack: Vite, React, TypeScript (strict), Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa, uPlot, fflate. The only network call is Open Food Facts search for packaged foods.

Pushing to `main` runs the tests, builds, and deploys to GitHub Pages (`.github/workflows/deploy.yml`). The spec is in `docs/PRD.md`; project rules are in `CLAUDE.md`.
