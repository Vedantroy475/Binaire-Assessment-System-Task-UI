import type { SystemSnapshot } from "../../types";
import { MemoryModel } from "../../models/MemoryModel";
import { DiskModel } from "../../models/DiskModel";
import { formatBytes } from "../../utils/format";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/** Render a filled bar of a given width for a 0-100 percentage. */
function gauge(percent: number, width: number): string {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width);
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

/**
 * MemoryPanel — the `mem` box with labeled usage gauges, plus the small
 * `disks` box. Rendered as plain text block gauges (robust at any terminal
 * size, unlike the canvas-based bar widget which requires height % 4 == 0).
 */
export class MemoryPanel {
  private memBox: any;
  private diskBox: any;

  constructor(
    private screen: any,
    _contrib: any,
    opts: {
      mem: { top: string | number; left: string | number; width: string | number; height: string | number };
      disk: { top: string | number; left: string | number; width: string | number; height: string | number };
    },
  ) {
    this.memBox = blessed.box({
      parent: screen,
      label: " mem ",
      tags: true,
      top: opts.mem.top,
      left: opts.mem.left,
      width: opts.mem.width,
      height: opts.mem.height,
      border: { type: "line", fg: darkTheme.borderFg },
      style: { border: { fg: darkTheme.borderFg } },
    });
    this.diskBox = blessed.box({
      parent: screen,
      label: " disks ",
      tags: true,
      top: opts.disk.top,
      left: opts.disk.left,
      width: opts.disk.width,
      height: opts.disk.height,
      border: { type: "line", fg: darkTheme.borderFg },
      style: { border: { fg: darkTheme.borderFg } },
    });
  }

  get elements(): any[] {
    return [this.memBox, this.diskBox];
  }

  private barWidth(box: any): number {
    const w = typeof box.width === "number" ? box.width : 20;
    return Math.max(8, w - 4);
  }

  update(snapshot: SystemSnapshot): void {
    const mem = MemoryModel.from(snapshot.memory);
    const bw = this.barWidth(this.memBox);
    const rows: Array<{ label: string; pct: number; color: string }> = [
      { label: "Used", pct: mem.usedPercent(), color: "cyan" },
      { label: "Avail", pct: mem.total > 0 ? (mem.available / mem.total) * 100 : 0, color: "green" },
      { label: "Cache", pct: mem.cachePercent(), color: "yellow" },
      { label: "Swap", pct: mem.swapPercent(), color: "red" },
    ];
    const totals = [mem.used, mem.available, mem.cache, mem.swapUsed];
    this.memBox.setContent(
      ` Total: ${formatBytes(mem.total)}\n` +
        rows
          .map((r, i) => {
            const val = totals[i];
            const bytes = formatBytes(val, 1);
            return ` {bold}${r.label.padEnd(5)}{/bold} {${r.color}-fg}${gauge(r.pct, bw)}{/${r.color}-fg} ${r.pct.toFixed(0).padStart(3)}% ${bytes}`;
          })
          .join("\n"),
    );

    const dbw = this.barWidth(this.diskBox);
    const disks = snapshot.disks.slice(0, 3);
    if (disks.length === 0) {
      this.diskBox.setContent(" (no fixed disks)");
    } else {
      this.diskBox.setContent(
        disks
          .map((d) => {
            const dm = DiskModel.from(d);
            const pct = Number.isFinite(dm.usePercent) ? dm.usePercent : dm.total > 0 ? (dm.used / dm.total) * 100 : 0;
            const label = (dm.mount || dm.fs || "?").slice(0, 6);
            return ` {bold}${label.padEnd(6)}{/bold} {magenta-fg}${gauge(pct, dbw)}{/magenta-fg} ${pct.toFixed(0)}%`;
          })
          .join("\n"),
      );
    }
    this.screen.render();
  }
}


