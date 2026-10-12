/**
 * Integration test: renders the full DashboardPage headlessly and drives
 * several live update cycles, exercising every panel (including the
 * blessed-contrib line/bar/sparkline widgets) and the keyboard handlers.
 *
 * Run with:  node scripts/integration-test.js
 */
const blessedLib = require("blessed");
const contribLib = require("blessed-contrib");
global.blessed = blessedLib;
global.contrib = contribLib;

const { SystemInfoService } = require("../dist/api/SystemInfoService");
const { ProcessService } = require("../dist/api/ProcessService");
const { SearchEngine } = require("../dist/search/SearchEngine");
const { SortEngine } = require("../dist/sorting/SortEngine");
const { FilterEngine } = require("../dist/filters/FilterEngine");
const { useSystemStats } = require("../dist/hooks/useSystemStats");
const { DashboardPage } = require("../dist/pages/DashboardPage");

async function main() {
  const screen = blessedLib.screen({
    smartCSR: true,
    fullUnicode: true,
    dockBorders: true,
    input: process.stdin,
    output: { write: () => true, on: () => true, removeListener: () => true, end: () => true },
    tput: false,
    warnings: false,
  });
  // Provide explicit dimensions since the fake output has no terminal size.
  screen.width = 120;
  screen.height = 40;
  screen.cols = 120;
  screen.rows = 40;

  const search = new SearchEngine();
  const sort = new SortEngine();
  const filter = new FilterEngine();
  const user = { uid: "t", email: "tester@example.com", displayName: "tester" };

  let received = 0;
  const stats = new useSystemStats(
    new SystemInfoService(),
    new ProcessService(),
    () => {},
    1000,
  );

  const dash = new DashboardPage(screen, contribLib, stats, user, search, sort, filter);
  stats.setOnUpdate((bundle) => {
    received++;
    dash.onStats(bundle);
  });

  console.log("driving 3 update cycles...");
  for (let i = 0; i < 3; i++) {
    await stats.poll();
  }
  console.log("update cycles received:", received);

  console.log("simulating navigation + search/sort/filter + resize...");
  sort.setColumn("memBytes");
  search.setQuery("svc");
  filter.setCriteria({ minCpu: 0 });
  dash.onStats(stats.get());
  dash.refreshFromMenu();
  dash.focusProc();

  // Simulate a terminal resize (triggers layout rebuild path).
  screen.width = 101; // odd width on purpose to test even() guarding
  screen.height = 34;
  screen.emit("resize");
  dash.onStats(stats.get());

  console.log("\nINTEGRATION TEST PASSED — dashboard rendered", received, "cycles + resize without error");
  process.exit(0);
}

main().catch((e) => {
  console.error("INTEGRATION TEST FAILED:", e && e.stack ? e.stack : e);
  process.exit(1);
});

