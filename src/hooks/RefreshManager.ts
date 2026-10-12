/**
 * RefreshManager — runs an async task on a fixed interval without overlapping
 * executions. If a poll takes longer than the interval, the next tick waits
 * for it to finish rather than piling up.
 */
export class RefreshManager {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = true;

  constructor(
    private readonly task: () => Promise<void>,
    private readonly intervalMs: number,
  ) {
    if (this.intervalMs <= 0) this.intervalMs = 1000;
  }

  /** Start the refresh loop. Runs the task immediately, then on interval. */
  start(): void {
    if (this.timer) return;
    this.stopped = false;
    const tick = async () => {
      if (this.stopped) return;
      if (this.running) return; // skip if previous run hasn't finished
      this.running = true;
      try {
        await this.task();
      } catch {
        /* swallow; keep polling */
      } finally {
        this.running = false;
        if (!this.stopped) {
          this.timer = setTimeout(tick, this.intervalMs);
        }
      }
    };
    void tick();
  }

  /** Stop the refresh loop. */
  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return !this.stopped;
  }
}
