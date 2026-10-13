# Binaire Freznel Assessment — System Tasks & Sensor Viewer (Terminal TUI)

A **terminal-only** (CLI / Terminal / PowerShell) live system-task and sensor viewer
built with **Node.js + TypeScript**, using an OOP/Class-based architecture. It
reproduces the reference `btop`-style UI: CPU/GPU graphs, per-core load, memory,
disks, disk IO, network, battery and an interactive process table.

Authentication uses a **step-by-step terminal wizard**
(`src/components/Auth/AuthFlow.ts`): choose sign in or sign up, then enter one
field per screen.

> This is **not** a browser app. It runs entirely in the terminal.

---

## 1. Requirements

- **Git** — to clone the repository
- **Node.js >= 18** (developed on Node 24)
- A terminal that supports Unicode + ANSI colors (Windows Terminal, PowerShell,
  iTerm2, GNOME Terminal, etc.)

---

## 2. Clone & run on your local machine

### Step 1 — Clone the repository

```bash
git clone https://github.com/Vedantroy475/Binaire-Assessment-System-Task-UI.git
cd Binaire-Assessment-System-Task-UI
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Run the app

**Option A — development mode (recommended while reviewing):**

```bash
npm run dev
```

Runs the TypeScript sources directly with `tsx` — no build step, always the
latest code.

**Option B — build then run the compiled output:**

```bash
npm run build   # tsc: compiles src/ into dist/
npm start       # node dist/index.js
```

> ⚠️ `npm start` executes the **compiled `dist/`** folder. After editing
> `src/` you must run `npm run build` again, or you will see stale code.
> When in doubt, use `npm run dev`.

### Step 4 (optional) — Configure the environment

The app runs with **no configuration at all** (demo mode). To customize,
create a `.env` file:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

| Setting | Without a `.env` (defaults) | With `.env.example` copied verbatim |
| --- | --- | --- |
| `AUTH_STUB` | defaults to `true` → **demo mode**, any non-empty credentials work | set to `false` → **real Firebase auth required** |
| `FIREBASE_*` | unused | you must paste your Firebase web config values |
| `REFRESH_INTERVAL` | `1000` (ms) | `1000` (ms), editable |

> ⚠️ `.env.example` ships with `AUTH_STUB=false`. If you copy it unchanged
> **without** setting `FIREBASE_API_KEY`, the app refuses to start and prints
> an error explaining what to do. Either add your Firebase API key or change
> the line to `AUTH_STUB=true` for demo mode.

### What you'll see

1. The **auth wizard** — full walkthrough in §3.
2. After authenticating, the **live dashboard** (CPU/GPU graphs, process
   table, memory, disks, network, …).

---

## 3. Authentication walkthrough (step by step)

Each screen asks for **exactly one thing**, so the terminal cursor always has
a single, obvious place to be.

### Step 1 — Choose the mode

```text
How would you like to continue?

 [ Sign in ]    [ Sign up ]

 ← → / Tab to switch · Enter to select
```

| Key | Action |
| --- | --- |
| `←` / `↑` | Highlight **Sign in** |
| `→` / `↓` | Highlight **Sign up** |
| `Tab` / `Shift+Tab` | Move between the two buttons |
| `Enter` | Select the highlighted mode and continue |

### Step 2+ — Enter the fields

| Mode | Steps, in order |
| --- | --- |
| **Sign in** | Email → Password |
| **Sign up** | Full name → Email → Password |

Every field step shows one bordered input plus `Continue` (on the last step,
`Enter`) and `← Back` buttons:

| Key | Action |
| --- | --- |
| typing | input goes to the single focused field (the cursor is parked there) |
| `Enter` in the input | validate and advance (email format, non-empty checks) |
| `Tab` / `↓` | cycle focus: input → Continue → Back → input |
| `Shift+Tab` / `↑` | cycle focus backwards |
| `Esc` or `← Back` | go to the previous step (from the first field, back to mode selection) |
| `Enter` on a button | activate the focused button |

Submitting the last (Password) step calls the `AuthService` (`signIn` or
`signUp` according to the mode chosen in step 1). On success the dashboard
opens; on failure the error appears inline on the password step so you can
retry.

---

## 4. Dashboard keyboard controls

| Key | Action |
| --- | --- |
| `↑` / `↓` or `k` / `j` | Move selection in the process table |
| `PgUp` / `PgDn` | Jump 10 rows |
| `g` / `G` | Go to top / bottom |
| `/` | Search processes (live) |
| `s` | Sort column menu |
| `f` | Filter by user |
| `F` | Clear filters |
| `Enter` / `i` | Show process info |
| `t` | Terminate selected process (with `y`/`n` confirm) |
| `q` / `Esc` / `Ctrl+C` | Quit |

The UI is **responsive** — resizing the terminal re-lays-out every panel.

---

## 5. Architecture (Class / OOP based)

The code follows the provided folder architecture. Each concern is a class:

```text
src/
├─ types/                 # Shared domain interfaces (+ blessed-contrib shim)
├─ models/                # OOP models: ProcessModel, CpuModel, MemoryModel,
│                          #   DiskModel, NetworkModel, GpuModel, BatteryModel
├─ api/                   # Data-access layer
│  ├─ SystemInfoService   #   SENSOR data (systeminformation)
│  └─ ProcessService      #   SYSTEM TASKS (processes)
├─ auth/                  # AuthService (interface) + StubAuthService +
│                          #   FirebaseAuthService (REST) + AuthConfig + AuthError
├─ components/
│  ├─ Layout/             # AppLayout (grid + resize), FooterBar
│  ├─ Models/             # Panel components (Cpu, Core, Memory, Disk, Io, Net, Header, Proc)
│  ├─ Auth/               # AuthFlow — step-by-step auth wizard
│  ├─ Search/             # SearchBox
│  ├─ Sorting/            # SortMenu
│  └─ Filters/            # FilterMenu
├─ filters/               # FilterEngine (pure logic)
├─ sorting/               # SortEngine (pure logic)
├─ search/                # SearchEngine (pure logic)
├─ hooks/                 # RefreshManager, KeyboardManager, useSystemStats
├─ offline/               # SessionStore
├─ pages/                 # AuthPage (gate), DashboardPage (main monitor)
├─ styles/                # btop-like color theme
├─ utils/                 # format helpers, RingBuffer
└─ index.ts               # Bootstrap / DI wiring
```

> The former `SignUpScreen` / `SignInScreen` single-form components were
> **removed** and replaced by `AuthFlow`, a small state machine that renders
> one step at a time (mode → name?/email → password). Its public surface
> (`focus()`, `setError()`, `destroy()`, `element`) matches what `AuthPage`
> already consumed, so the page wiring and `AuthService` contract are
> unchanged.

### Auth data flow

```text
AuthPage (pages/)
   │  creates & owns
   ▼
AuthFlow (components/Auth/) ── step machine: mode → [name] → email → password
   │  onSubmit(email, password, name, mode)
   ▼
AuthService (auth/) ── StubAuthService (demo) | FirebaseAuthService (REST)
   │  AuthUser
   ▼
SessionStore (offline/) ──► onAuthed ──► DashboardPage (pages/)
```

### Dashboard data flow

```text
SystemInfoService + ProcessService  (api/)
        │  (normalized SystemSnapshot)
        ▼
useSystemStats  (hooks/)  ── RefreshManager (polling, non-overlapping)
        │  StatsBundle
        ▼
DashboardPage  (pages/)  ── KeyboardManager (interactivity)
        │
        ▼
AppLayout  ──► panels (components/Models) ──► models/ ──► utils/format
```

---

## 6. Libraries (task constraint satisfied)

The assessment requires that **no single library** is used for all three of:
UI, fetching system tasks, and sensor information. This project uses:

| Concern | Library |
| --- | --- |
| **UI (terminal)** | `blessed` + `blessed-contrib` |
| **System tasks (processes)** | `systeminformation` |
| **Sensor info** (CPU/GPU, memory, disks, IO, network, battery) | `systeminformation` |
| **Auth (separate concern)** | Firebase **Identity Platform REST API** (native `fetch`) + `dotenv` |

`blessed`/`blessed-contrib` handle **only** the UI; `systeminformation` handles
**only** the data. No single library covers all three concerns.

> Note on charts: the CPU history uses the `blessed-contrib` **line** chart
> (robust at any size). Memory/disk/network use text block-gauges/sparklines
> rendered with `blessed` boxes — the `blessed-contrib` `bar` widget requires
> `height % 4 == 0` which is fragile across terminal sizes, so we avoid it for a
> crash-free responsive UI.

---

## 7. Firebase authentication (optional — demo stub by default)

By default the app runs with a **stub auth service** (`AUTH_STUB` defaults to
`true` when no `.env` exists), so the dashboard can be reviewed without a
Firebase project. In demo mode any non-empty credentials are accepted.

To enable real Firebase:

1. Create a project at <https://console.firebase.google.com>
2. Enable **Authentication → Sign-in method → Email/Password**
3. Copy your web app config into a `.env` file (see `.env.example`):

   ```env
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=...
   FIREBASE_STORAGE_BUCKET=...
   FIREBASE_MESSAGING_SENDER_ID=...
   FIREBASE_APP_ID=...
   AUTH_STUB=false
   REFRESH_INTERVAL=1000
   ```

4. **No SDK install is needed** — `FirebaseAuthService` calls the Firebase
   Identity Platform **REST API** with Node's built-in `fetch`, so there is
   nothing to `npm install` beyond the project's own dependencies.

The UI consumes only the `AuthService` interface, so swapping between the stub
and the Firebase implementation requires no changes elsewhere — `src/index.ts`
selects the service from `AUTH_STUB`.

---

## 8. Tests / verification

All script tests load the compiled `dist/`, so build first:

```bash
npm run build            # compile src/ -> dist/
npm run typecheck        # tsc --noEmit

node scripts/smoke-test.js           # data layer + search/sort/filter logic
node scripts/integration-test.js     # full dashboard render + resize (headless)
node scripts/auth-test.js            # auth flow (stub)
node scripts/auth-firebase-test.js   # Firebase auth service (mocked fetch, offline)
```

