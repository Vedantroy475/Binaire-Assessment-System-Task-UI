import type { SystemSnapshot, ProcessInfo } from "../types";
import { SystemInfoService } from "../api/SystemInfoService";
import { ProcessService } from "../api/ProcessService";
import { RefreshManager } from "./RefreshManager";

/** Combined, model-ready data assembled each poll cycle. */
export interface StatsBundle {
  snapshot: SystemSnapshot;
  processes: ProcessInfo[];
  totalProcesses: number;
}

/**
 * useSystemStats — orchestrates polling of the sensor service and process
 * service, merges their results into a single snapshot, and invokes a callback
 * on every successful update. Backed by RefreshManager so refreshes never
 * overlap.
 */
export class useSystemStats {
  private refresh: RefreshManager;
  private latest: StatsBundle | null = null;
  private onUpdate: (bundle: StatsBundle) => void;

  constructor(
    private readonly infoService: SystemInfoService,
    private readonly processService: ProcessService,
    onUpdate: (bundle: StatsBundle) => void,
    intervalMs: number,
  ) {
    this.onUpdate = onUpdate;
    this.refresh = new RefreshManager(() => this.poll(), intervalMs);
  }

  /** Set/replace the update callback (e.g. once the dashboard is created). */
  setOnUpdate(cb: (bundle: StatsBundle) => void): void {
    this.onUpdate = cb;
  }

  /** Kick off polling (runs one immediate poll first). */
  start(): void {
    this.refresh.start();
  }

  /** Stop polling. */
  stop(): void {
    this.refresh.stop();
  }

  /** Perform a single poll of both services and emit the merged result. */
  async poll(): Promise<void> {
    const [snapshot, processes] = await Promise.all([
      this.infoService.snapshot(),
      this.processService.list(),
    ]);
    const bundle: StatsBundle = {
      snapshot: { ...snapshot, processes },
      processes,
      totalProcesses: this.processService.lastTotal || processes.length,
    };
    this.latest = bundle;
    this.onUpdate(bundle);
  }

  /** The most recent bundle, if any. */
  get(): StatsBundle | null {
    return this.latest;
  }
}

