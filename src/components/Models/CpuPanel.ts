import type { SystemSnapshot } from "../../types";
import { CpuModel } from "../../models/CpuModel";
import { RingBuffer } from "../../utils/RingBuffer";
import { formatTemp } from "../../utils/format";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * CpuPanel — the top CPU / GPU load graph strip plus per-core bars.
 * Uses blessed-contrib line + bar widgets fed by rolling history buffers.
 */
export class CpuPanel {
  private line: any;
  private coresBox: any;
  private headerBox: any;
  private cpuHistory = new RingBuffer(60);
  private gpuHistory = new RingBuffer(60);

  constructor(
    private screen: any,
    contrib: any,
    opts: { top: string | number; left: string | number; width: string | number; height: string | number },
  ) {
    this.line = contrib.line({
      top: opts.top,
      left: opts.left,
      width: opts.width,
      height: opts.height,
      style: { line: "yellow", text: "green", baseline: "black" },
      xLabelPadding: 3,
      numYLabels: 0,
      showLegend: true,
      legend: { width: 12 },
      wholeNumber: false,
      label: " cpu ▼ gpu ",
      border: { type: "line", fg: darkTheme.borderFg },
    });
    screen.append(this.line);

    this.headerBox = blessed.box({
      parent: screen,
      top: opts.top,
      left: opts.left,
      width: opts.width,
      height: 1,
      tags: true,
      style: { fg: darkTheme.text },
    });
  }

  get element(): any {
    return this.line;
  }

  update(snapshot: SystemSnapshot): void {
    const cpu = CpuModel.from(snapshot.cpu);
    this.cpuHistory.push(Number(cpu.totalLoad.toFixed(1)));
    this.gpuHistory.push(Number(snapshot.gpu.utilization.toFixed(1)));

    const n = Math.max(this.cpuHistory.length, this.gpuHistory.length);
    const xs = Array.from({ length: n }, (_, i) => String(i));
    this.line.setData([
      { title: "cpu", x: xs, y: this.cpuHistory.toArray(), style: { line: "red" } },
      { title: "gpu", x: xs, y: this.gpuHistory.toArray(), style: { line: "green" } },
    ]);

    const temp = formatTemp(cpu.temperatureC);
    this.headerBox.setContent(` {bold}${cpu.shortBrand()}{/bold}  {gray-fg}${cpu.speedGHz.toFixed(2)} GHz  ${temp}{/gray-fg}`);
    this.screen.render();
  }
}
