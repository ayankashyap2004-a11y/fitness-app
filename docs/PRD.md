# PRD: Personal Fitness App (v1)

**Owner:** Ayan  **Users:** 1 (personal use)  **Status:** Draft v1.3 (full mess library)  **Date:** 29 Sep 2026

---

## 1. Summary

A personal fitness app that does three things well:

1. Calculates daily calorie and protein targets from your profile and goal, and keeps them current as your weight changes.
2. Lets you log food against those targets, using a food library built around hostel mess meals, plus packaged products.
3. Runs a 5-day workout split with sets, reps and form instructions, switches between gym and home versions of each exercise, and logs what you actually lifted.

**Hard constraint: ₹0 to run and maintain.** No servers, no paid APIs, no subscriptions.

---

## 2. Goals and non-goals

### Goals
- Enter profile details once; targets are calculated automatically from then on.
- Logging a meal takes under 30 seconds (under 5 seconds for a saved meal).
- Logging a set takes one tap to confirm, or two if the numbers changed.
- Every workout works equally well at the gym or at home.
- All data survives a lost or reset phone through export and import.

### Non-goals (v1)
- Automatic progression suggestions (logging only, by choice).
- Accounts, cloud sync, or multiple users.
- Water tracking, body measurements, wearables, and social features.

---

## 3. Platform and technical approach

| Decision | Choice | Why |
|---|---|---|
| App type | Installable web app (PWA) on Android | Installs from Chrome to the home screen, runs full-screen and offline. No Play Store fee, no APK build pipeline. |
| Hosting | GitHub Pages or Cloudflare Pages | Free, with HTTPS (a PWA requirement). |
| Storage | On-device IndexedDB (via Dexie.js) | No database bill. Call `navigator.storage.persist()` so Android doesn't clear the data. |
| Food data | Open Food Facts API plus a bundled local library | Open Food Facts is free and has no API key. The bundled library covers home-cooked Indian food. |
| Frontend | React or Preact + Vite | Small bundle, fast on mobile. |
| Charts | Lightweight chart library (e.g. Chart.js or uPlot) | Used for the bodyweight trend. |
| Backup | Export and import as a single `.zip` (JSON data plus photos) | Protects against data loss, since nothing is stored in the cloud. |

**Running cost:** ₹0. The only recurring effort is occasionally running a backup export.

---

## 4. Feature specifications

### 4.1 Profile and onboarding (one-time)

**Fields:**
- Name
- Sex
- Date of birth (age is calculated from this and stays correct over time)
- Height (cm)
- Current weight (kg)
- Activity level
- Goal

**Activity level options (multipliers):**

| Level | Description | Factor |
|---|---|---|
| Sedentary | Desk job, little walking | 1.2 |
| Lightly active | Some walking, light exercise 1–3 days | 1.375 |
| Moderately active | Training 3–5 days | 1.55 |
| Very active | Hard training 6–7 days or a physical job | 1.725 |

The activity factor already includes planned training. **The app must not add workout calories on top**, or they would be counted twice.

**Goal options:** Fat loss, Muscle gain, Gaintain (recomp).

All fields can be edited later in Settings.

### 4.2 Calorie and macro engine

**Step 1: BMR (Mifflin-St Jeor)**
- Male: `10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5`
- Female: `10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161`

**Step 2: Maintenance (TDEE)**
`TDEE = BMR × activity factor`

**Step 3: Goal adjustment**

Fat loss and muscle gain each have three intensity settings, chosen in onboarding and changeable in Settings. The default is moderate. Values are set from the research in Appendix B.

| Goal | Mild | Moderate (default) | Aggressive | Protein |
|---|---|---|---|---|
| Fat loss | TDEE − 250 kcal | TDEE − 500 kcal | TDEE − 750 kcal | 2.2 g/kg |
| Muscle gain | TDEE × 1.05 | TDEE × 1.10 | TDEE × 1.15 | 1.8 g/kg |
| Gaintain (recomp) | TDEE (no intensity options) | | | 2.0 g/kg |

**Why these numbers:**
- **Fat loss uses a fixed calorie deficit, not a percentage.** A meta-regression found that deficits beyond about 500 kcal/day are associated with losing lean mass during resistance training, so moderate sits at that point. Aggressive (−750) is allowed but shows a warning that it risks more muscle loss.
- **Muscle gain uses a 5–15% surplus.** For novice and intermediate lifters, reviews recommend a 10–20% surplus, targeting 0.25–0.5% of bodyweight gained per week; the upper end mainly adds fat.
- **Protein:** gains in fat-free mass plateau around 1.6 g/kg on average, with 2.2 g/kg as the upper bound that covers most people. The targets sit inside that range, highest during fat loss.

**Target rate band:** each goal has an expected weekly weight change, and the Progress chart shades it:
- Fat loss: −0.5% to −1% of bodyweight per week.
- Muscle gain: +0.25% to +0.5% per week.
- Recomp: roughly flat.
The app shows whether the 7-day trend is inside, above or below the band. This is display only; you decide whether to adjust.

**Step 4: Fat and carbs**
- Fat: 25% of calories, kept between 0.6 and 1.5 g/kg.
- Carbs: the remaining calories. During muscle gain, show a note if carbs fall below 3 g/kg.
- Conversions: protein and carbs are 4 kcal/g, fat is 9 kcal/g.

**Safety floor:** calorie targets never go below BMR. If the goal math would push below it, show the BMR value instead with a short note explaining why.

**Recalculation:**
- Targets recalculate from the **7-day average bodyweight**, not the latest single weigh-in. This prevents daily water swings from moving targets around.
- Targets also recalculate whenever a profile field changes.

**Display:** calories, protein, carbs and fat on the Today screen, shown as consumed / target with progress bars. Protein is visually prioritised.

### 4.3 Food logging

**Context:** most meals come from the MICA hostel mess. Seven weeks of menus (17 Aug – 4 Oct 2026) show:
- **The menu changes every week.** There is no fixed rotation, but individual dishes repeat heavily (dal tadka, jeera rice, roti, curd, paneer bhurjee, chole and so on).
- **Every day has five slots:** a breakfast item, lunch (about 7 items), an evening snack, dinner (about 7 items), and a dessert or drink.
- **Non-veg appears only at dinner, about 3 nights a week,** usually a chicken or mutton dish midweek, an egg dish on Friday, and chicken on Sunday. Lunches are always vegetarian.
- Mess food isn't weighed and oil varies, so logging uses visual portions (katori, ladle, piece, roti) rather than grams.

**Mess dish library (core):**
- All 340 items from these menus, each mapped to a **dish archetype** (Appendix A), shipped as seed data in `data/mess-dishes.json` and `data/archetypes.json`. Each archetype has a default portion unit and starting macro estimates.
- Dishes inherit their archetype's macros until you override them. If one dish is clearly heavier or lighter than the archetype (e.g. a very oily sev tamatar), edit that dish once.
- **Unknown dish:** when a new name appears, you pick the closest archetype and it's saved as a new dish.

**Weekly menu import:**
- Each week the mess posts a new menu image. Send it to Claude in chat and ask for the app's menu JSON; then use **Import menu** in the app. This costs nothing, needs no API, and takes about a minute.
- After import, **today's dishes for the current slot appear first** on the Food screen, so logging is: tap dish → pick portion.
- Dish names are matched to the library by name or alias, case-insensitive; anything unmatched is flagged for an archetype pick during import and saved as a new dish.
- If no menu is imported, the Food screen falls back to recent and frequent dishes plus search.

**Menu JSON format:**
```json
{
  "weekStart": "2026-09-28",
  "days": [
    {
      "date": "2026-09-28",
      "breakfast": ["Masala Poha", "French Toast"],
      "lunch": ["Amritsari Chole", "Kulche", "Veg Pulav", "Boondi Raita", "Dal Tadka", "Pakoda Kadi"],
      "snacks": ["Bhel"],
      "dinner": ["Paneer Paratha", "Achari Aloo Paratha", "Yellow Dal", "Coriander Rice", "Curd"],
      "dessert": ["Chocolate Pudding"]
    }
  ]
}
```
Condiments (pickle, chutney, salad) can be omitted from the import; they're available as quick-adds.

**Daily defaults (Ayan's routine):**
- **Breakfast = eggs + the mess breakfast item.** A **"Usual breakfast"** button opens a confirm sheet listing each item with its own quantity stepper: boiled eggs (count), anda bhurji (eggs used), and today's mess item (katori, piece or slice). Adjust any number, then save all at once.
- **Eggs:** 4–5 a day, split between boiled and anda bhurji. The default split is set once in Settings (e.g. 2 boiled + 2-egg bhurji) and remembered.
- **Whey: 1 scoop daily,** pinned as a one-tap item available in any slot. Its per-scoop macros are entered once from the tub's label during onboarding, since brands vary.
- Pinned items appear regardless of the imported menu.

**Protein planning on the Today screen:**
- Lunch is always vegetarian and non-veg dinner comes about 3 nights a week, so protein varies a lot by day. The Today screen shows **tonight's dinner main** from the imported menu (e.g. "Tonight: Butter Chicken" or "Tonight: veg").
- It also shows **protein still needed before dinner**, so on veg nights you know to pick the paneer, soya or legume dish, or take the whey later in the day.

**Oil adjustment:** each archetype carries a default oil estimate. A quick "+1 tsp oil" button (about 45 kcal, 5 g fat) covers visibly oily days. This matters most for calorie accuracy during fat loss.

**Meal slots:** Breakfast, Lunch, Snacks, Dinner, Dessert, matching the mess structure. Dessert has its own slot because it's daily and adds up.

**Sources, searched in this order:**
1. **Saved meals:** your repeat meals (e.g. "Usual breakfast: 4 eggs + 2 toast"), logged with one tap.
2. **Personal library:** foods and dishes you add once with macros per 100 g or per serving (e.g. "Mom's chicken curry, 1 katori").
3. **Bundled starter library:** about 60 items with values sourced from IFCT (NIN) and USDA at build time. Mess dishes are seeded first:
   - Eggs: boiled egg (per piece), anda bhurji (per egg used, with oil estimate)
   - Mess dishes: the library in Appendix A
   - Packaged: whey protein and any others you use, added from Open Food Facts
4. **Open Food Facts search:** packaged products (e.g. Amul, protein bars). Anything logged from here is cached locally so it works offline next time.

**Logging flow:**
Search → pick an item → choose a unit (piece, katori, ladle, roti, g, serving) → quantity → assign to Breakfast, Lunch, Snacks, Dinner or Dessert → save.

**Quantity rules (every item, every slot, including breakfast and pinned items):**
- Every item has a − / + stepper plus tap-to-type, in steps of 0.5 (e.g. 1.5 katori, 3 eggs, 0.5 paratha).
- Items with more than one sensible unit let you switch: chicken curry by katori or by piece, rice by katori or ladle, paneer bhurji by katori or spoon.
- Quantities stay editable after saving, from the day's log.
- The last quantity you used for an item becomes its default next time.

**Also included:**
- Copy yesterday's meal.
- Edit or delete entries.
- Daily totals against targets.

**v1.1 candidate:** barcode scanning using Chrome Android's built-in BarcodeDetector API, looked up against Open Food Facts. This is free to add, but not required for launch.

### 4.4 Workout split (5 days, intermediate)

**Structure:** Push / Pull / Legs / Upper / Lower, with 2 rest days. Every major muscle is trained twice a week.

**Why this split (Appendix B):**
- When weekly volume is matched, split and full-body routines produce equivalent muscle and strength gains, so the split is chosen for logistics: 5 days fits your schedule and the gym/home mix.
- **Weekly sets per muscle are the main driver of growth.** The largest dose-response analysis to date found returns diminish but keep rising, while training frequency adds little once volume is accounted for. Twice a week is enough to spread the sets.
- **Volume is counted fractionally:** a direct set counts as 1, and a compound set counts as 0.5 for helper muscles (e.g. bench press = 0.5 triceps set). That method best predicted outcomes in the same analysis.

**Starting weekly volume (fractional sets):**

| Muscle | Sets/week | Muscle | Sets/week |
|---|---|---|---|
| Chest | 13 | Quads | 12.5 |
| Back (lats + upper back) | 14 | Hamstrings | 10.5 |
| Side delts | 8 | Glutes | 10.5 |
| Rear delts | 7 | Calves | 7 |
| Biceps | 14 | Triceps | 12 |
| Abs | 3 (plus bracing work) | | |

This is a moderate start. The growth curve keeps rising past it, so the app lets you add sets across a training block and shows the new weekly totals.

**Training parameters:**
- **Effort:** compound lifts at 1–3 reps in reserve (RIR); isolation lifts at 0–1 RIR. Training closer to failure has a modest link to more growth but no clear strength benefit, and more fatigue, so failure is kept for safer isolation exercises.
- **Rest:** 2–3 min for compounds, 1.5–2 min for isolations. Longer rests (2+ min) may help trained lifters by allowing more total work.
- **Exercise selection favours the stretched position:** training a muscle at long lengths tends to produce more growth. That's why the plan uses overhead triceps extensions instead of pushdowns, seated leg curls instead of lying curls, incline curls, and calf raises with a pause at the bottom.
- **Optional lengthened partials:** on the last set of an isolation exercise, after reaching failure, you may add partial reps in the stretched half of the movement. This is marked optional in the app.
- **Progression:** stay within the rep range; when you hit the top of it on all sets, add weight next session. The app shows last session's numbers to make this easy but doesn't prompt.

**Scheduling:** days run in a rotation, not fixed weekdays. If you miss Tuesday, the next session is still the next day in the split.

**Gym and home toggle:** chosen at the start of each session. Each exercise has a gym version and a home version that train the same muscle in a similar position.

**Each exercise entry contains:**
- Name and the muscles it targets
- Sets × rep range, target RIR and rest time
- A how-to in 3–5 steps
- Form cues and common mistakes
- Text only in v1, with no images or videos

#### Day 1: Push (chest, shoulders, triceps)

| Exercise (gym) | Home swap | Sets × Reps | RIR | Rest |
|---|---|---|---|---|
| Barbell bench press | DB floor press or deficit push-ups | 3 × 6–8 | 1–2 | 3 min |
| Incline DB press | Feet-elevated push-ups | 3 × 8–10 | 1–2 | 2–3 min |
| Seated DB shoulder press | Standing DB shoulder press | 3 × 8–10 | 1–2 | 2 min |
| Cable or DB lateral raise | DB lateral raise | 4 × 10–15 | 0–1 | 1.5 min |
| Overhead cable triceps extension | DB overhead triceps extension | 3 × 10–12 | 0–1 | 1.5 min |
| Cable fly (deep stretch) | DB floor fly or band fly | 2 × 12–15 | 0–1 | 1.5 min |

#### Day 2: Pull (back, biceps, rear delts)

| Exercise (gym) | Home swap | Sets × Reps | RIR | Rest |
|---|---|---|---|---|
| Lat pulldown or pull-ups | Pull-ups or band pulldown | 3 × 6–10 | 1–2 | 2–3 min |
| Chest-supported row | One-arm DB row | 3 × 8–10 | 1–2 | 2 min |
| Seated cable row (full stretch) | Band row | 2 × 10–12 | 1 | 2 min |
| Reverse pec deck or face pull | DB rear delt fly | 3 × 12–15 | 0–1 | 1.5 min |
| Incline DB curl | Incline DB curl (bench) or DB curl with arms behind torso | 3 × 10–12 | 0–1 | 1.5 min |
| Hammer curl | DB hammer curl | 2 × 10–12 | 0–1 | 1.5 min |

#### Day 3: Legs (quad focus)

| Exercise (gym) | Home swap | Sets × Reps | RIR | Rest |
|---|---|---|---|---|
| Back squat | Goblet squat or DB front squat | 3 × 6–8 | 2–3 | 3 min |
| Romanian deadlift | DB Romanian deadlift | 3 × 8–10 | 2 | 2–3 min |
| Leg press | Heel-elevated goblet squat | 3 × 10–12 | 1 | 2 min |
| Seated leg curl | Slider or towel leg curl | 3 × 10–12 | 0–1 | 1.5 min |
| Leg extension | Sissy squat or band Spanish squat | 2 × 12–15 | 0–1 | 1.5 min |
| Standing calf raise (2 s pause at bottom) | Single-leg DB calf raise off a step | 4 × 10–15 | 0–1 | 1.5 min |

#### Day 4: Upper (mixed)

| Exercise (gym) | Home swap | Sets × Reps | RIR | Rest |
|---|---|---|---|---|
| Incline barbell or Smith press | Incline DB press or feet-elevated push-ups | 3 × 6–8 | 1–2 | 3 min |
| Neutral-grip pull-ups or pulldown | Pull-ups or band pulldown | 3 × 6–10 | 1–2 | 2–3 min |
| One-arm cable or DB row | One-arm DB row | 3 × 8–10 | 1–2 | 2 min |
| Machine chest press or dips | Chair dips or push-ups | 2 × 8–12 | 1 | 2 min |
| Lateral raise | DB lateral raise | 4 × 12–15 | 0–1 | 1.5 min |
| Superset: overhead triceps extension + incline curl | Same with dumbbells | 2 × 10–12 each | 0–1 | 1.5 min |

#### Day 5: Lower (hamstring and glute focus)

| Exercise (gym) | Home swap | Sets × Reps | RIR | Rest |
|---|---|---|---|---|
| Conventional or trap-bar deadlift | Heavy DB Romanian deadlift | 3 × 4–6 | 2–3 | 3 min |
| Hip thrust | DB or single-leg hip thrust | 3 × 8–10 | 1 | 2 min |
| Bulgarian split squat | DB Bulgarian split squat | 3 × 8–10 each leg | 1–2 | 2 min |
| Seated leg curl | Slider or towel leg curl | 3 × 10–12 | 0–1 | 1.5 min |
| Seated calf raise (pause at bottom) | Bent-knee DB calf raise | 3 × 12–15 | 0–1 | 1.5 min |
| Hanging leg raise | Lying leg raise | 3 × 10–15 | 0–1 | 1 min |

**Deload weeks:**
- Triggered automatically after every 6 completed training weeks.
- During a deload week, the same exercises are planned at **half the usual sets**, with a banner explaining why.
- The evidence on deload timing is limited; 6 weeks is a practical default, not a researched optimum.
- A **Skip** button pushes the deload back by one week. It can be skipped repeatedly, but the banner notes how many weeks have passed.
- Logging works the same as in normal weeks, and the 6-week counter resets once the deload is completed.

**Editing:** you can swap any exercise for another from the library, change sets and reps, and reorder exercises. Edits save to your template.

### 4.5 Workout logging

- For each set: weight (kg) and reps. The fields pre-fill from the same set in the last session, so an unchanged set takes one tap.
- **Show "Last time: 60 kg × 8"** next to every set. This is display only, with no suggestions.
- Log RIR per set optionally (a quick 0 / 1 / 2 / 3+ tap), so you can see whether sets are hard enough.
- **Weekly volume view:** fractional sets per muscle for the current week, compared with the plan in 4.4. Display only.
- A rest timer starts automatically after a set is logged, using the rest time on that exercise. You can skip or extend it.
- Optional notes per exercise (e.g. "left shoulder felt tight").
- **Session summary:** total sets, total volume (weight × reps) and duration.
- **History:** a per-exercise log listing every session's sets.

### 4.6 Cardio logging

- Log a session with type (walk, run, cycle, swim, sport, other), duration, and optional distance and notes.
- Cardio appears in the weekly summary and in history.
- **Cardio calories are not added to the daily target.** The activity level already covers them, so adding them would count them twice. If cardio is a regular extra on top of lifting, choose a higher activity level instead.

### 4.7 Progress: bodyweight trend

- Log weight in 1 tap from the Today screen. A morning weigh-in is recommended.
- The chart shows daily weigh-ins as dots and the 7-day moving average as a line.
- Range toggle: 4 weeks, 12 weeks or all time.
- Shows the weekly rate of change (kg/week), so you can check it against your goal. For example, fat loss at roughly 0.5–1% of bodyweight per week.

### 4.8 Progress photos

- Capture with the camera or pick from the gallery. Tag each as front, side or back.
- Photos are stored on the device in the app's IndexedDB, not in the gallery, so they stay private.
- A compare view shows two dates side by side.
- Optional weekly reminder. This is a Settings toggle; notifications are free through the PWA.
- Photos are included in the backup export. Compress to about 1080 px on save to keep the backup small.

### 4.9 Settings and backup

- Edit profile fields and the goal.
- Unit preferences (kg only in v1).
- **Export all data** as a `.zip` saved to the phone's Downloads folder.
- **Import** from a `.zip` to restore data.
- Backup reminder: if 14 days have passed since the last export, show a banner on the Today screen.

---

## 5. Screens

1. **Onboarding:** profile fields, activity level, goal, then shows the calculated targets.
2. **Today (home):** macro rings or bars, quick weight log, today's workout card with a Start button, and a meal list.
3. **Food:** search, saved meals, personal library, and the day's log.
4. **Workout:** gym/home toggle, then the exercise list, then set logging with the rest timer, then the summary.
5. **Progress:** weight chart, photo timeline and compare view, exercise history.
6. **Settings:** profile, backup, reminders.

Navigation: a bottom tab bar with Today, Food, Workout, Progress and Settings.

---

## 6. Data model

| Entity | Key fields |
|---|---|
| Profile | name, sex, dob, heightCm, activityLevel, goal, intensity |
| WeightLog | date, weightKg |
| Archetype | id, name, defaultUnit, perPortion {kcal, p, c, f}, defaultOilTsp |
| FoodItem | id, name, source (bundled/personal/OFF/mess), archetypeId (mess dishes), macro override, servingUnits[] |
| MenuDay | date, slot, foodIds[] (from weekly import) |
| PinnedItem | slot (or any), foodId, defaultQty (boiled eggs, anda bhurji, whey) |
| SavedMeal | id, name, items[{foodId, qty, unit}] |
| FoodLogEntry | date, mealSlot, foodId, qty, unit, computed macros |
| Exercise | id, name, muscles[], equipment (gym/home), howTo[], cues[], mistakes[], swapId |
| WorkoutTemplate | dayIndex, name, exercises[{exerciseId, sets, repRange, restSec}] |
| WorkoutSession | id, date, templateDay, mode (gym/home), durationSec, isDeload |
| CardioLog | id, date, type, durationMin, distanceKm, note |
| SetLog | sessionId, exerciseId, setNo, weightKg, reps, note |
| ProgressPhoto | id, date, angle, blob |
| AppMeta | lastBackupDate, splitPointer (next day in rotation), weeksSinceDeload |

---

## 7. Success criteria (personal)

- You log food on 6 or more of 7 days for 4 straight weeks.
- You complete 4 or more sessions a week on average.
- The bodyweight trend moves in the goal direction within 4–6 weeks. If it doesn't, adjust the activity level or goal percentage.
- No data is lost across a phone reset, verified with one test restore.

---

## 8. Open questions

1. **Remaining archetype estimates:** the Appendix A values are starting estimates. Verify the most-eaten 10–15 dishes against IFCT/USDA during the build.

**Resolved:** mess menu structure (weekly-changing, imported via JSON); breakfast routine (eggs + mess item, 4–5 eggs); daily whey. **Resolved in v1.1:** goal intensity (mild, moderate, aggressive for fat loss and muscle gain), deloads (automatic every 6 weeks with a skip option), cardio (session logging, no calorie add-back), exercise instructions (text only).

---

## 9. Roadmap

- **v1:** everything in section 4, including the mess menu.
- **v1.1:** barcode scanning.
- **Later (still ₹0):** body measurements, water tracking, optional automatic progression suggestions.

---

## Appendix A: Mess food library

**Coverage:** every item on the seven MICA menus from 17 Aug to 4 Oct 2026 — 340 unique dishes, sides and desserts, plus the two pinned egg items. Each maps to one of 92 archetypes. The machine-readable versions are `data/archetypes.json` and `data/mess-dishes.json`; this table is a readable view of the same data.

**How values work:**
- Per-portion values assume typical mess oil. 1 katori ≈ 150 ml.
- **✓ = checked against a published source** (USDA FoodData Central, ICMR-NIN values, or standardised Indian recipe analyses; see Appendix B). Expect ±15% for mess cooking.
- **No mark = estimate** built from checked items and typical recipes. Treat as ±25% and edit the dishes you eat most.
- 12 dishes that run clearly heavier than their archetype (e.g. Sev Tamatar, Rogan Josh, Butter Chicken) carry a dish-level override in the JSON.
- Spelling variants seen on the menus ("Biriyani", "Sambhar", "Toor Daal", "Macroni", "Pulav", …) are stored as aliases, so imports match regardless of spelling.

### Staples

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Plain rice ✓ | katori (~150 g); also per ladle | 195 | 4 | Plain Rice, Rice, Steamed Rice |
| Flavoured rice / pulao | katori; also per ladle | 250 | 4 | Bagara Rice, Basanti Pulao, Coriander Rice, Ghee Rice, Hara Pulao, Herb Butter Rice, Herbed Rice, Jeera Rice, Lemon Rice, Masala Matar Pulao, Masala Pulao, Masala Rice, Matar Pulao, Mexican Rice, Peas Pulao, Saffron Rice, Tomato Onion Rice, Veg Pulao |
| Curd rice / khichdi / pongal | katori | 220 | 6 | Curd Rice, Khichdi, Masala Khichdi, Pongal, Tadka Curd Rice |
| Veg biryani | plate (~250 g); also per katori | 400 | 8 | Veg Biryani, Vegetable Dum Biryani |
| Paneer biryani | plate (~250 g); also per katori | 460 | 14 | Paneer Biryani |

### Breads

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Roti ✓ | piece (~35 g) | 105 | 3 | Roti, Tandoori Roti |
| Naan / kulcha | piece | 260 | 7 | Butter Naan, Garlic Naan, Kulche, Naan, Stuffed Kulcha |
| Thepla ✓ | piece | 120 | 2.5 | Beetroot Thepla, Methi Thepla |
| Plain / layered paratha | piece | 200 | 4 | Ajwain Paratha, Laccha Paratha, Parotta, Triangle Paratha |
| Stuffed paratha | piece | 250 | 6 | Achari Aloo Paratha, Aloo Paratha, Cheese Onion Paratha, Gobhi Paratha, Mix Veg Paratha, Mooli Paratha, Onion Paratha |
| Paneer paratha | piece | 280 | 9 | Paneer Paratha |
| Puri / luchi | piece | 100 | 2 | Bedmi Puri, Luchi Poori, Palak Poori, Puri |
| Bhatura | piece | 250 | 5 | Bhature |
| Baati | piece | 230 | 5 | Masala Baati, Saada Baati |
| Litti ✓ | piece | 180 | 6 | Litti |
| Pav ✓ | piece | 131 | 4 | Pav |
| Bread sticks | 2 sticks | 80 | 2.5 | Bread Sticks |

### Dals & legumes

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Thin dal ✓ | katori (~150 g); also per ladle | 160 | 7 | Arhar Dal, Chana Dal, Cholar Dal, Dal Fry, Dal Palak, Dal Tadka, Dhaba Style Dal, Garlic Tadka Dal, Green Moong, Hyderabadi Dal Tadka, Lauki Chana Dal, Lehsuni Dal, Masoor Dal, Mix Dal, Mixed Dal, Moong Dal, Muradabadi Dal, Palak Dal, Pancharatna Dal, Toor Dal, Yellow Dal |
| Rich dal | katori; also per ladle | 250 | 9 | Black Dal, Dal Makhani |
| Sambar | katori; also per ladle | 110 | 4 | Sambar |
| Rasam | katori | 50 | 1 | Rasam |
| Legume curry ✓ | katori | 240 | 8 | Amritsari Chole, Chole Masala, Desi Chana, Dry Ghughni Masala, Dry Rajma Masala, Mix Usal, Peas Curry, Pindi Chole, Rajma Masala, Red Chawli, White Chawli, White Matar Curry |
| Soya dish | katori | 220 | 15 | Dry Soya Bean Masala, Soya Chaap, Soya Chaap Masala, Soyabean Masala |
| Pithla (besan curry) ✓ | katori | 230 | 8 | Pithla |

### Curd-based

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Kadhi | katori | 130 | 4 | Punjabi Kadhi |
| Kadhi with pakoda | katori | 220 | 6 | Kadhi Pakoda, Pakoda Kadhi |
| Curd / dahi | katori (~100 g) | 90 | 4 | Curd, Dahi |
| Raita | katori | 110 | 4 | Banana Raita, Boondi Raita, Cucumber Raita, Mix Veg Raita, Onion Raita, Pineapple Raita |
| Buttermilk | glass | 40 | 2 | Buttermilk |

### Vegetables

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Dry veg sabzi | katori | 150 | 3 | Aloo Bhaja, Aloo Capsicum, Aloo Methi, Aloo Palak, Aloo Sabzi, Baingan Bharta, Batata Bhaji, Besan Bhindi, Bhindi Bharwa, Bhindi Do Pyaza, Bhindi Masala, Cabbage Sabzi, Cabbage Tamatar, Chilli Gobhi Dry, Chokha, Corn Masala, Gobhi Matar, Jeera Aloo, Masala Jeera Aloo, Raw Banana Masala Fry, Sai Bhaji, Veg Jhalfrezi |
| Fried / crisp veg | katori | 220 | 3 | Kurkuri Bhindi |
| Veg gravy | katori | 200 | 4 | Aloo Rasawala, Bengali Dum Aloo, Cabbage Green Peas Curry, Dum Aloo, Gatte Ki Sabji, Kashmiri Dum Aloo, Makhana Matar Masala, Mix Veg, Mix Veg Curry, Mughlai Mix Veg, Mushroom Masala, Sev Tamatar, Veg Gravy, Veg Keema, Veg Stew, Veg Tawa Masala |
| Kofta / malai gravy | katori (2 kofta) | 320 | 6 | Cheese Kofta, Lauki Kofta, Malai Kofta, Methi Matar Malai, Veg Kofta |

### Paneer

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Paneer dish ✓ | katori (~50 g paneer) | 300 | 11 | Butter Paneer, Butter Paneer Masala, Kadhai Paneer, Matar Paneer, Mughlai Paneer, Palak Paneer, Paneer Do Pyaza, Paneer Ghee Roast, Paneer Kali Mirch, Paneer Khurchan, Paneer Kolhapuri, Paneer Makhani, Paneer Pasanda |
| Paneer bhurji | katori; also per tbsp | 280 | 15 | Paneer Bhurji |

### Non-veg

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Chicken curry | katori; also per piece (bone-in) | 250 | 18 | Butter Chicken, Champaran Chicken, Chicken Ghee Roast, Chicken Gravy, Chicken Kolhapuri, Chicken Stew, Mughlai Chicken |
| Chicken biryani | plate (~250 g); also per katori | 450 | 20 | Chennai Chicken Biryani, Chicken Biryani, Chicken Dum Biryani |
| Mutton curry | katori; also per piece (bone-in) | 320 | 20 | Mutton Gravy, Rogan Josh |
| Mutton biryani | plate (~250 g); also per katori | 480 | 20 | Mutton Biryani |
| Egg curry | 2 eggs + gravy; also per egg + gravy | 260 | 13 | Dhaba Style Egg Curry, Egg Dhaba Curry, Egg Ghotala, Egg Gravy, Goan Egg Curry, Kerala Egg Curry |
| Egg biryani | plate with 1 egg; also per katori | 420 | 12 | Egg Biryani |
| Non-veg gravy (biryani side) | katori | 180 | 8 | Non Veg Gravy |

### Breakfast

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Boiled egg ✓ | large egg (~50 g) | 78 | 6.3 | Boiled Egg (pinned) |
| Anda bhurji ✓ | per egg used | 120 | 6.3 | Anda Bhurji (pinned) |
| Poha / upma ✓ | katori | 200 | 3 | Indori Poha, Masala Poha, Veg Upma, Vermicelli Upma |
| French toast | slice | 150 | 5 | French Toast |
| Sandwich | sandwich | 280 | 8 | Bombay Sandwich, Coleslaw Sandwich, Corn Mayo Sandwich, Ghughra Sandwich, Paneer Bhurji Sandwich, Spinach Corn Sandwich |
| Cheela | piece | 130 | 6 | Besan Cheela, Moong Dal Cheela, Stuffed Paneer Chila |
| Pancakes | 2 pieces | 300 | 6 | Banana Pancakes, Chocolate Pancakes |

### South Indian

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Idli | piece | 60 | 2 | Idli |
| Plain dosa | piece | 150 | 3 | Plain Dosa |
| Masala dosa | piece | 250 | 5 | Masala Dosa, Podi Masala Dosa |
| Uttapam | piece | 200 | 5 | Masala Uttapam, Onion Uttapam, Podi Onion Uttapam, Ragi Uttapam |
| Medu wada ✓ | piece | 140 | 5 | Medu Wada |

### Other mains

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Pasta | plate | 380 | 11 | Cheese Macaroni, Pasta, Penne & Spaghetti |
| Tacos / enchiladas | portion (2 tacos) | 300 | 9 | Baked Enchiladas, Baked Veg, Mexican Tacos |
| Mayo salad | katori | 200 | 3 | Macaroni Salad, Mayonnaise Potato Salad |
| Soup | bowl | 80 | 2 | Hot & Sour Soup, Lemon Coriander Soup, Manchow Soup, Mushroom Soup, Sweet Corn Soup, Tomato Basil Soup, Tomato Soup, Veg Clear Soup |
| Pav bhaji (bhaji only) | katori | 200 | 4 | Bhaji |
| Pasta sauce (extra) | ladle | 60 | 1 | Red Sauce, White Sauce |

### Snacks

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Chaat | plate | 250 | 6 | Aloo Tikki Chaat, Bhel, Chana Chaat, Corn Chaat, Dahi Puri, Idli Takatak, Paani Puri, Papdi Chaat, Ragda Paani Puri, Samosa Chaat, Sev Puri |
| Fried snack | plate | 300 | 5 | Bread Pakoda, Cheesy Fries, Honey Chilli Potato, Mix Pakoda, Mysore Bonda, Peri Peri Fries, Punugulu, Salted French Fries |
| Dal wada ✓ | piece | 92 | 2 | Dal Wada |
| Dahi wada ✓ | piece | 73 | 2.5 | Dahi Wada |
| Dabeli ✓ | piece | 230 | 5 | Dabeli |
| Kachori | piece | 250 | 5 | Pyaaz Kachori |
| Khaman / dhokla ✓ | piece | 73 | 3 | Khaman, White Dhokla |
| Maggi | plate | 350 | 8 | Cheese Maggi, Punjabi Tadka Maggi, Veg Maggi |
| Toast / bread roll | portion | 250 | 7 | Baked Beans Toast, Cheese Corn Bread Roll, Sooji Toast |
| Kebab / cutlet | 2 pieces | 200 | 5 | Beetroot Cutlet, Hara Bhara Kebab |
| Sabudana khichdi ✓ | katori (~150 g) | 300 | 4 | Sabudana Khichdi |
| Sabudana tikki ✓ | piece | 99 | 1.4 | Sabudana Tikki |
| Parle-G | 4 biscuits | 110 | 1.5 | Parle G |

### Drinks

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Chai | cup | 90 | 3 | Adrak Chai, Elaichi Chai |
| Milk drink | glass | 220 | 7 | Cold Coffee, Elaichi Lassi, Pista Badam Milk |
| Soft drink / juice / mojito | glass | 120 | 0 | Fanta, Nimbu Paani, Pineapple Juice, Soft Drink, Virgin Mojito, Watermelon Juice |

### Desserts

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Ice cream | scoop | 140 | 2 | American Nuts Ice Cream, Badam Carnival Ice Cream, Choco Brownie Ice Cream, Choco Chip Ice Cream, Ice Cream, Mango Ice Cream, Mix Ice Cream, Rajbhog Ice Cream, Vanilla Brownie Ice Cream, Vanilla Ice Cream |
| Milk sweet (katori) | katori | 250 | 6 | Bengali Payasam, Chocolate Pudding, Fruit Custard, Mithi Boondi, Rava Kesari, Rice Kheer, Sewai Kheer, Shahi Tukda, Shrikhand, Sitaphal Basundi, Tiramisu |
| Rich halwa / churma | katori | 350 | 6 | Churma, Moong Dal Halwa |
| Syrup sweet (piece) | piece | 150 | 2 | Coconut Barfi, Gulab Jamun, Jalebi, Malpua, Rasgulla, Rasmalai |

### Sides

| Archetype | Portion | kcal | Protein (g) | Dishes from the menus |
|---|---|---|---|---|
| Papad (roasted) | piece | 35 | 2 | Papad |
| Papad (fried) / rice papad | piece | 70 | 2 | Fried Papad, Rice Papad |
| Papad churi | katori | 120 | 3 | Papad Churi |
| Fryums | handful | 60 | 0.5 | Fryums |
| Fried mirchi | piece | 50 | 0.5 | Fried Mirchi |
| Pickle | tsp | 25 | 0 | Pickle |
| Coconut / peanut / Mysore chutney, thecha | tbsp | 45 | 1 | Coconut Chutney, Mysore Chutney, Peanut Chutney, Thecha |
| Green / garlic / tomato chutney | tbsp | 15 | 0.3 | Green Chutney, Lehsuni Chutney, Tomato Chutney |
| Podi masala (with oil) | tbsp | 60 | 2 | Podi Masala |
| Salad (plain veg) | katori | 25 | 1 | Green Salad, Kakdi Salad, Mexican Salad, Mix Salad, Onion Masala Salad, Onion Rings Salad, Onion Salad, Red Cabbage Salad, Salad |
| Sprouts / chickpea salad | katori | 140 | 7 | Chickpea Salad, Sprouts Salad |
| Peanut chaat | katori | 200 | 8 | Peanut Chaat |

---

## Appendix B: Evidence base

### Training

- **Split vs full body:** Ramos-Campo et al. (2024), *J Strength Cond Res*, systematic review and meta-analysis of 14 studies. With volume matched, split and full-body training gave equivalent hypertrophy and strength.
- **Volume and frequency:** Pelland et al. (2026), *Sports Medicine* 56(2), meta-regressions of 67 studies (2,058 participants). More weekly sets → more growth with gradually diminishing returns; frequency had little independent effect on growth but did help strength; fractional set counting fit best.
- **Proximity to failure:** Robinson et al. (2024), *Sports Medicine* 54(9). Closer to failure had a modest association with hypertrophy and negligible association with strength.
- **Rest intervals:** Singer et al. (2024), *Frontiers in Sports and Active Living*. Rest of 2+ minutes may be advantageous for hypertrophy in trained lifters.
- **Muscle length:** Maeo et al. (overhead vs neutral-arm triceps extension; seated vs prone leg curl), Kassiano et al. (calf raises in the stretched range), and Wolf et al. (2023 meta-analysis; 2025 trial finding lengthened partials similar to full ROM for arms). Basis for exercise selection and the optional lengthened partials.

### Nutrition

- **Protein:** Morton et al. (2018), *Br J Sports Med*, meta-analysis of 49 trials. Plateau around 1.6 g/kg/day, upper bound about 2.2 g/kg/day.
- **Deficit size:** Murphy & Koehler (2022), *Scand J Med Sci Sports*. Energy deficits impaired lean-mass gains; about 500 kcal/day was the break-even point. A later independent reanalysis argued the threshold is uncertain and any deficit may cost some lean mass, which is why the aggressive setting carries a warning.
- **Surplus size and rate:** Iraki et al. (2019), *Sports*. 10–20% surplus, 0.25–0.5% bodyweight gain per week for novice/intermediate lifters; fat 0.5–1.5 g/kg; carbs ≥3–5 g/kg.
- **Fat-loss rate:** Helms et al. (2014) guidance of 0.5–1% bodyweight loss per week.

### Food values (✓ items in Appendix A)

- Boiled egg: USDA, 1 large egg ≈ 78 kcal, 6.3 g protein.
- Cooked white rice: USDA, ≈ 130 kcal and 2.7 g protein per 100 g.
- Roti: ≈ 104 kcal, 2.6 g protein per 35 g whole-wheat chapati (standardised recipe analysis).
- Dal tadka: ≈ 235 kcal, 8.7 g protein per 220 g (masoor dal tadka recipe analysis).
- Chole / rajma: ≈ 220–300 kcal and 7–10 g protein per serving (recipe analyses).
- Paneer (cow milk): ≈ 265 kcal, 18.3 g protein per 100 g (ICMR-NIN values).
- Kanda poha: ≈ 180 kcal, 2.2 g protein per plate (recipe analysis).
- Thepla: ≈ 120 kcal, 2.3 g protein per piece (recipe analysis) — lighter than paratha, so it has its own archetype.
- Pithla: ≈ 182 kcal, 6.3 g protein per 120 g serving.
- Litti: ≈ 123–220 kcal per piece depending on size and ghee; sattu filling makes it protein-richer than most breads.
- Khaman dhokla: ≈ 73 kcal per piece (recipe analysis).
- Dabeli: ≈ 220–250 kcal, ~5 g protein per piece (recipe analyses).
- Dal vada ≈ 92 kcal and dahi vada ≈ 73 kcal per piece; sabudana vada ≈ 99 kcal per piece; sabudana khichdi ≈ 299 kcal per cooked cup; pav ≈ 131 kcal per piece.
