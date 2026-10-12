/**
 * Headless smoke test for the data layer + logic engines.
 * Run with:  node scripts/smoke-test.js
 * Does NOT require a TTY. Verifies systeminformation works on this platform
 * and that the model/search/sort/filter logic behaves correctly.
 */
const { SystemInfoService } = require("../dist/api/SystemInfoService");
const { ProcessService } = require("../dist/api/ProcessService");
const { ProcessModel } = require("../dist/models/ProcessModel");
const { SearchEngine } = require("../dist/search/SearchEngine");
const { SortEngine } = require("../dist/sorting/SortEngine");
const { FilterEngine } = require("../dist/filters/FilterEngine");
const { formatBytes, formatUptime, formatBytesPerSec } = require("../dist/utils/format");

async function main() {
  const info = new SystemInfoService();
  const snap = await info.snapshot();
  console.log("=== SENSOR SNAPSHOT ===");
  console.log("uptime:", formatUptime(snap.uptimeSeconds));
  console.log("cpu.brand:", snap.cpu.brand, "| load:", snap.cpu.totalLoad.toFixed(1) + "%", "| cores:", snap.cpu.coreLoads.length);
  console.log("mem.total:", formatBytes(snap.memory.totalBytes), "| used:", formatBytes(snap.memory.usedBytes));
  console.log("disks:", snap.disks.length, snap.disks.slice(0, 2).map((d) => `${d.mount} ${d.usePercent}%`).join(", "));
  console.log("io r/w:", formatBytesPerSec(snap.io.readBytesPerSec), "/", formatBytesPerSec(snap.io.writeBytesPerSec));
  console.log("net:", snap.network.iface, snap.network.ipAddress);
  console.log("battery:", JSON.stringify(snap.battery));

  const proc = new ProcessService();
  const procs = await proc.list();
  console.log("\n=== PROCESSES ===");
  console.log("count:", procs.length, "| lastTotal:", proc.lastTotal);
  const sample = procs.slice(0, 3).map((p) => `${p.pid} ${p.name} cpu=${p.cpu.toFixed(1)} mem=${formatBytes(p.memBytes)}`);
  console.log(sample.join("\n"));

  // Logic engine tests
  console.log("\n=== LOGIC TESTS ===");
  const models = procs.map((p) => new ProcessModel(p));

  const search = new SearchEngine();
  search.setQuery(models[0] ? models[0].name.slice(0, 3) : "zzz");
  const found = search.apply(models);
  console.log(`search "${search.getQuery()}" matched ${found.length}/${models.length}`);

  const sort = new SortEngine();
  sort.setColumn("cpu");
  const sorted = sort.apply(models);
  let ordered = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].cpu < sorted[i].cpu) ordered = false;
  }
  console.log("sort by cpu desc, correct:", ordered, "| top:", sorted[0]?.cpu.toFixed(1));

  const filter = new FilterEngine();
  filter.setCriteria({ minCpu: 1 });
  const filtered = filter.apply(models);
  const allAbove = filtered.every((m) => m.cpu >= 1);
  console.log(`filter minCpu>=1: ${filtered.length} kept, all>=1:`, allAbove);

  console.log("\nALL CHECKS COMPLETED");
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e);
  process.exit(1);
});
