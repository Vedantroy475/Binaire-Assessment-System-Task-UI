import type { SystemSnapshot } from "../../types";
import { BatteryModel } from "../../models/BatteryModel";
import { formatUptime } from "../../utils/format";

declare const blessed: any;

/**
 * HeaderPanel — the top status bar: clock (center), battery, CPU brand + GHz
 * (right), and menu/uptime hints (left), matching the reference layout.
 */
export class HeaderPanel {
  private box: any;

  constructor(
    private screen: any,
    opts: { top: string | number; left: string | number; width: string | number; height: string | number },
  ) {
    this.box = blessed.box({
      parent: screen,
      top: opts.top,
      left: opts.left,
      width: opts.width,
      height: opts.height,
      tags: true,
      style: { bg: "blue", fg: "white" },
    });
  }

  get element(): any {
    return this.box;
  }

  update(snapshot: SystemSnapshot): void {
    const width = typeof this.box.width === "number" ? this.box.width : 100;
    const clock = new Date(snapshot.timestamp).toTimeString().slice(0, 8);
    const battery = BatteryModel.from(snapshot.battery).label();
    const cpu = `${snapshot.cpu.brand.replace(/\(R\)|\(TM\)|CPU|@.*/gi, "").trim()} ${snapshot.cpu.speedGHz.toFixed(2)} GHz`;
    const left = " menu preset *";
    const right = `${battery}  ${snapshot.cpu.speedGHz >= 0 ? "┃ " : ""}${cpu} `;

    const midStart = Math.max(0, Math.floor((width - clock.length) / 2));
    let line = this.pad(left, midStart) + clock;
    const remaining = width - line.length;
    if (remaining > right.length) {
      line += this.pad("", remaining - right.length) + right;
    }
    this.box.setContent(line);
    this.screen.render();
  }

  private pad(text: string, width: number): string {
    if (width <= 0) return "";
    return (text + " ".repeat(width)).slice(0, width);
  }
}
