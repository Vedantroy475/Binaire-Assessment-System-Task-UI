import * as si from "systeminformation";
import type { ProcessInfo } from "../types";

/**
 * ProcessService — the data-access layer for SYSTEM TASKS (processes).
 *
 * Wraps `systeminformation.processes()` and normalizes each entry into a
 * `ProcessInfo`. Kept separate from the sensor service and the UI layer.
 */
export class ProcessService {
  /** Total number of processes reported on the last poll. */
  lastTotal = 0;

  /** Fetch and normalize the current process list. */
  async list(): Promise<ProcessInfo[]> {
    try {
      const data = await si.processes();
      this.lastTotal = data?.all ?? data?.list?.length ?? 0;
      const rows = (data?.list ?? []).map((p): ProcessInfo => {
        return {
          pid: p.pid ?? 0,
          name: p.name ?? "",
          // Prefer full command line, fall back to path/name.
          command: p.command || p.params ? `${p.command} ${p.params}`.trim() : p.path || p.name || "",
          // systeminformation does not expose a per-process thread count on
          // every platform; derive a best-effort value (0 = unknown).
          threads: 0,
          user: p.user ?? "",
          // Resident set size in bytes (memRss is already in KiB on some
          // platforms; systeminformation returns bytes here).
          memBytes: p.memRss ?? p.memVsz ?? 0,
          cpu: typeof p.cpu === "number" ? p.cpu : 0,
          state: p.state ?? "",
          parentPid: p.parentPid ?? 0,
        };
      });
      return rows;
    } catch {
      this.lastTotal = 0;
      return [];
    }
  }
}
