import type { MemoryInfo } from "../types";
import { formatBytes } from "../utils/format";

/** Encapsulates main-memory / swap data with derived usage math. */
export class MemoryModel {
  constructor(private readonly data: MemoryInfo) {}

  static from(info: MemoryInfo): MemoryModel {
    return new MemoryModel(info);
  }

  get total(): number {
    return this.data.totalBytes;
  }
  get used(): number {
    return this.data.usedBytes;
  }
  get available(): number {
    return this.data.availableBytes;
  }
  get cache(): number {
    return this.data.cacheBytes;
  }
  get swapTotal(): number {
    return this.data.swapTotalBytes;
  }
  get swapUsed(): number {
    return this.data.swapUsedBytes;
  }

  /** Used percentage (0-100). */
  usedPercent(): number {
    if (this.total <= 0) return 0;
    return (this.used / this.total) * 100;
  }

  /** Cache/buffer percentage (0-100). */
  cachePercent(): number {
    if (this.total <= 0) return 0;
    return (this.cache / this.total) * 100;
  }

  /** Swap usage percentage (0-100). */
  swapPercent(): number {
    if (this.swapTotal <= 0) return 0;
    return (this.swapUsed / this.swapTotal) * 100;
  }

  /** Pre-render a set of labeled gauges suitable for a blessed `bar` widget. */
  toBarData(): Array<{ title: string; percent: number }> {
    const pct = (n: number) => Number(n.toFixed(1));
    return [
      { title: `Used: ${formatBytes(this.used)}`, percent: pct(this.usedPercent()) },
      { title: `Avail: ${formatBytes(this.available)}`, percent: pct(
        this.total > 0 ? (this.available / this.total) * 100 : 0,
      ) },
      { title: `Cache: ${formatBytes(this.cache)}`, percent: pct(this.cachePercent()) },
      { title: `Swap: ${formatBytes(this.swapUsed)}/${formatBytes(this.swapTotal)}`, percent: pct(this.swapPercent()) },
    ];
  }
}
