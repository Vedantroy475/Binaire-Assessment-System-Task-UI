import "dotenv/config";
import { loadConfig } from "./auth/AuthConfig";
import { StubAuthService } from "./auth/StubAuthService";
import { FirebaseAuthService } from "./auth/FirebaseAuthService";
import type { AuthService } from "./auth/AuthService";
import { SessionStore } from "./offline/SessionStore";
import { SystemInfoService } from "./api/SystemInfoService";
import { ProcessService } from "./api/ProcessService";
import { SearchEngine } from "./search/SearchEngine";
import { SortEngine } from "./sorting/SortEngine";
import { FilterEngine } from "./filters/FilterEngine";
import { useSystemStats } from "./hooks/useSystemStats";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";

declare const blessed: any;

/**
 * Application entry point.
 *
 * Boots the terminal UI, performs authentication (via the AuthService, which is
 * the Firebase-backed implementation once configured, or the stub in demo mode),
 * then renders the live system tasks & sensor dashboard.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  // Guard: real Firebase auth was requested (AUTH_STUB=false) but no API key is
  // configured. Exit gracefully with a clear error instead of silently falling
  // back to the demo stub or crashing later on the first sign-in attempt.
  if (
    !config.authStub &&
    (!config.firebase.apiKey || config.firebase.apiKey.trim() === "")
  ) {
    // eslint-disable-next-line no-console
    console.error(
      "AUTH_STUB=false but FIREBASE_API_KEY is not set.\n" +
        "Copy .env.example to .env and add your Firebase web API key, or set " +
        "AUTH_STUB=true to run in demo mode.",
    );
    process.exit(1);
  }

  // Enter the alternate screen buffer for a clean, full-screen TUI.
  process.stdout.write("\x1b[?1049h\x1b[2J\x1b[H");

  // Set up the blessed screen and expose blessed + contrib globally.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const blessedLib = require("blessed");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const contribLib = require("blessed-contrib");
  (global as any).blessed = blessedLib;

  const screen = blessedLib.screen({
    smartCSR: true,
    title: "Binaire Freznel Assessment — System Tasks & Sensor Viewer",
    fullUnicode: true,
    dockBorders: true,
  });
  (global as any).contrib = contribLib;
  (global as any).screen = screen;
  screen.key(["C-c"], () => shutdown(screen));

  // Data layer.
  const infoService = new SystemInfoService();
  const processService = new ProcessService();
  const search = new SearchEngine();
  const sort = new SortEngine();
  const filter = new FilterEngine();
  const session = new SessionStore();

  // Auth service: Firebase when configured, otherwise the stub (demo mode).
  const auth: AuthService = config.authStub
    ? new StubAuthService()
    : await createFirebaseAuth(config);

  const stats = new useSystemStats(
    infoService,
    processService,
    () => {
      /* onUpdate is (re)assigned once the dashboard exists */
    },
    config.refreshIntervalMs,
  );

  let dashboard: DashboardPage | null = null;

  // Route: if already signed in, go straight to the dashboard.
  const existing = await auth.currentUser();
  if (existing) {
    enterDashboard(existing);
  } else {
    const authPage = new AuthPage(screen, auth, session, (user) => {
      authPage.destroy();
      enterDashboard(user);
    });
  }

  function enterDashboard(user: { uid: string; email: string; displayName: string }): void {
    // Rebind stats updates to the dashboard.
    stats.setOnUpdate((bundle) => dashboard?.onStats(bundle));
    dashboard = new DashboardPage(screen, (global as any).contrib, stats, user, search, sort, filter);
    stats.start();
    // Render one frame immediately.
    void stats.poll();
  }

  // Keep the process alive; stats polling drives the UI.
  process.on("SIGINT", () => shutdown(screen));
  process.on("SIGTERM", () => shutdown(screen));
}

/**
 * Factory for the real Firebase auth service (Identity Platform REST API).
 * The FirebaseAuthService constructor validates the API key and throws a
 * friendly AuthError if it is missing; main() has already guarded the
 * AUTH_STUB=false + missing-key case before this runs.
 */
async function createFirebaseAuth(_config: ReturnType<typeof loadConfig>): Promise<AuthService> {
  // The config.firebase object carries all Firebase web config fields; only
  // apiKey is required by the REST implementation.
  return new FirebaseAuthService({ apiKey: _config.firebase.apiKey });
}

function shutdown(screen: any): void {
  try {
    screen.destroy();
  } catch {
    /* ignore */
  }
  process.stdout.write("\x1b[?1049l");
  process.exit(0);
}

main().catch((err) => {
  process.stdout.write("\x1b[?1049l");
  // eslint-disable-next-line no-console
  console.error("Fatal error:", err);
  process.exit(1);
});
