# Binaire Freznel Assessment — System Tasks & Sensor Viewer (Terminal TUI)

A **terminal-only** (CLI / Terminal / PowerShell) live system-task and sensor viewer
built with **Node.js + TypeScript**, using an OOP/Class-based architecture. It
reproduces the reference `btop`-style UI: CPU/GPU graphs, per-core load, memory,
disks, disk IO, network, battery and an interactive process table.

> This is **not** a browser app. It runs entirely in the terminal.

---

## 1. Requirements

- Node.js >= 18 (developed on Node 24)
- A terminal that supports Unicode + ANSI colors (Windows Terminal, PowerShell,
  iTerm2, GNOME Terminal, etc.)

---

## 2. Install & Run

```bash
# Install dependencies
npm install

# Development (run TypeScript directly)
npm run dev

# OR build then run the compiled app
npm run build
npm start
```

On launch you will see a **Sign-up / Sign-in** screen. In the default **stub
(demo) auth** mode, any non-empty email + password is accepted, after which the
live dashboard appears.

---

## 3. Keyboard controls (full keyboard interactivity)

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

## 4. Architecture (Class / OOP based)

The code follows the provided folder architecture. Each concern is a class:

```
src/
├─ types/                 # Shared domain interfaces (+ blessed-contrib shim)
├─ models/                # OOP models: ProcessModel, CpuModel, MemoryModel,
│                          #   DiskModel, NetworkModel, GpuModel, BatteryModel
├─ api/                   # Data-access layer
│  ├─ SystemInfoService   #   SENSOR data (systeminformation)
│  └─ ProcessService      #   SYSTEM TASKS (processes)
├─ auth/                  # AuthService (interface) + StubAuthService + config
├─ components/
│  ├─ Layout/             # AppLayout (grid + resize), FooterBar
│  ├─ Models/             # Panel components (Cpu, Core, Memory, Disk, Io, Net, Header, Proc)
│  ├─ Auth/               # SignUpScreen, SignInScreen
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

### Data flow

```
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

## 5. Libraries (task constraint satisfied)

The assessment requires that **no single library** is used for all three of:
UI, fetching system tasks, and sensor information. This project uses:

| Concern | Library |
| --- | --- |
| **UI (terminal)** | `blessed` + `blessed-contrib` |
| **System tasks (processes)** | `systeminformation` |
| **Sensor info** (CPU/GPU, memory, disks, IO, network, battery) | `systeminformation` |
| **Auth (separate concern)** | `firebase` (wired later) + `dotenv` |

`blessed`/`blessed-contrib` handle **only** the UI; `systeminformation` handles
**only** the data. No single library covers all three concerns.

> Note on charts: the CPU history uses the `blessed-contrib` **line** chart
> (robust at any size). Memory/disk/network use text block-gauges/sparklines
> rendered with `blessed` boxes — the `blessed-contrib` `bar` widget requires
> `height % 4 == 0` which is fragile across terminal sizes, so we avoid it for a
> crash-free responsive UI.

---

## 6. Firebase authentication (currently stubbed)

By default the app runs with a **stub auth service** (`AUTH_STUB=true`) so the
dashboard can be reviewed without a Firebase project. To enable real Firebase:

1. Create a project at <https://console.firebase.google.com>
2. Enable **Authentication → Sign-in method → Email/Password**
3. Copy your web app config into a `.env` file (see `.env.example`):

   ```
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=...
   FIREBASE_STORAGE_BUCKET=...
   FIREBASE_MESSAGING_SENDER_ID=...
   FIREBASE_APP_ID=...
   AUTH_STUB=false
   REFRESH_INTERVAL=1000
   ```

4. Install the SDK: `npm i firebase`
5. Implement `src/auth/FirebaseAuthService.ts` to satisfy the `AuthService`
   interface (`signIn`, `signUp`, `currentUser`, `signOut`) using
   `firebase/auth`, and swap it in `src/index.ts` (see the
   `createFirebaseAuth()` factory).

The UI already consumes only the `AuthService` interface, so swapping the
implementation requires no changes elsewhere.

---

## 7. Tests / verification

```bash
npm run build           # TypeScript compile
npm run typecheck       # tsc --noEmit
node scripts/smoke-test.js        # data layer + search/sort/filter logic
node scripts/integration-test.js  # full dashboard render + resize (headless)
node scripts/auth-test.js         # auth flow (stub)
```

---



