import type { SystemSnapshot } from "../../types";
import { CpuModel } from "../../models/CpuModel";
import { formatTemp, formatPercent } from "../../utils/format";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * CorePanel — the right-hand CPU summary: total + per-core load with
 * temperatures, load average and GPU utilization gauges.
 */
export class CorePanel {
  private box: any;

  constructor(
    private screen: any,
    opts: { top: string | number; left: string | number; width: string | number; height: string | number },
  ) {
    this.box = blessed.box({
      parent: screen,
      label: " cores ",
      top: opts.top,
      left: opts.left,
      width: opts.width,
      height: opts.height,
      tags: true,
      border: { type: "line", fg: darkTheme.borderFg },
    });
  }

  get element(): any {
    return this.box;
  }

  update(snapshot: SystemSnapshot): void {
    const cpu = CpuModel.from(snapshot.cpu);
    const lines: string[] = [];
    lines.push(` {bold}CPU{/bold} {${this.color(cpu.totalLoad)}-fg}${formatPercent(cpu.totalLoad)}{/${this.color(cpu.totalLoad)}-fg}  ${formatTemp(cpu.temperatureC)}`);

    cpu.coreLoads.forEach((load, i) => {
      const bar = this.bar(load, 20);
      lines.push(
        ` C${i} {${this.color(load)}-fg}${bar}{/${this.color(load)}-fg} ${load.toFixed(0)}%`,
      );
    });

    const la = snapshot.loadAverage;
    lines.push(` {gray-fg}LOAD AVG{/gray-fg}  ${la.one.toFixed(2)}  ${la.five.toFixed(2)}  ${la.fifteen.toFixed(2)}`);

    const gpuLoad = snapshot.gpu.utilization;
    lines.push(
      ` {bold}GPU{/bold} {${this.color(gpuLoad)}-fg}${formatPercent(gpuLoad)}{/${this.color(gpuLoad)}-fg}  ${formatTemp(snapshot.gpu.temperatureC)}`,
    );
    lines.push(` {gray-fg}${snapshot.gpu.model.slice(0, 30)}{/gray-fg}`);

    this.box.setContent(lines.join("\n"));
    this.screen.render();
  }

  private color(load: number): string {
    return load >= 75 ? "red" : load >= 40 ? "yellow" : "green";
  }

  private bar(percent: number, width: number): string {
    const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  }
}
