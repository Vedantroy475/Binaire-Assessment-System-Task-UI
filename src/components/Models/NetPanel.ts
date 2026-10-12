import type { SystemSnapshot } from "../../types";
import { NetworkModel } from "../../models/NetworkModel";
import { RingBuffer } from "../../utils/RingBuffer";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * NetPanel — the `net` box showing the interface IP, download/upload sparkline
 * graphs and current + total throughput. Uses text-based block sparklines
 * (robust at any terminal width).
 */
export class NetPanel {
  private box: any;
  private downHist = new RingBuffer(60);
  private upHist = new RingBuffer(60);

  constructor(
    private screen: any,
    _contrib: any,
    opts: { top: number; left: number; width: number; height: number },
  ) {
    this.box = blessed.box({
      parent: screen,
      label: " net ",
      top: opts.top,
      left: opts.left,
      width: Math.max(10, opts.width),
      height: Math.max(5, opts.height),
      tags: true,
      border: { type: "line", fg: darkTheme.borderFg },
      style: { border: { fg: darkTheme.borderFg } },
    });
  }

  get element(): any {
    return this.box;
  }

  /** All screen-level elements owned by this panel (for cleanup on resize). */
  get elements(): any[] {
    return [this.box];
  }

  private sparkWidth(): number {
    const w = typeof this.box.width === "number" ? this.box.width : 80;
    return Math.max(10, w - 4);
  }

  /** Build a one-line text sparkline from the buffer. */
  private sparkline(hist: RingBuffer): string {
    const blocks = " ▁▂▃▄▅▆▇█";
    const vals = hist.toArray();
    if (vals.length === 0) return "";
    const max = Math.max(...vals, 1);
    const width = this.sparkWidth();
    // Use the most recent `width` samples.
    const slice = vals.slice(-width);
    return slice
      .map((v) => blocks[Math.min(blocks.length - 1, Math.round((v / max) * (blocks.length - 1)))])
      .join("");
  }

  update(snapshot: SystemSnapshot): void {
    const net = NetworkModel.from(snapshot.network);
    this.downHist.push(net.rxBytesPerSec);
    this.upHist.push(net.txBytesPerSec);

    const content =
      ` {bold}${net.ipAddress}{/bold} {gray-fg}<${net.iface}>{/gray-fg}\n` +
      ` {green-fg}▼${net.rxLabel()}{/green-fg}  ${net.rxTotalLabel()}\n` +
      ` {green-fg}${this.sparkline(this.downHist)}{/green-fg}\n` +
      ` {red-fg}▲${net.txLabel()}{/red-fg}  ${net.txTotalLabel()}\n` +
      ` {red-fg}${this.sparkline(this.upHist)}{/red-fg}`;
    this.box.setContent(content);
    this.screen.render();
  }
}



