import type { DiskInfo } from "../types";
import { formatBytes } from "../utils/format";

/** Represents a single mounted filesystem volume. */
export class DiskModel {
  constructor(private readonly data: DiskInfo) {}

  static from(info: DiskInfo): DiskModel {
    return new DiskModel(info);
  }

  get fs(): string {
    return this.data.fs;
  }
  get mount(): string {
    return this.data.mount;
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
  get usePercent(): number {
    return this.data.usePercent;
  }

  /** A short named label for display in the disks panel. */
  label(): string {
    return this.mount || this.fs;
  }

  /** Pre-render a labeled gauge for a blessed `bar` widget. */
  toBar(): { title: string; percent: number } {
    const pct = Number.isFinite(this.usePercent)
      ? Math.round(this.usePercent)
      : this.total > 0
        ? Math.round((this.used / this.total) * 100)
        : 0;
    return {
      title: `${this.label()} Used: ${pct}% (${formatBytes(this.available)} free)`,
      percent: pct,
    };
  }
}
