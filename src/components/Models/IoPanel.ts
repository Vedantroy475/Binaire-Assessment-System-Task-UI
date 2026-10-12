import type { SystemSnapshot } from "../../types";
import { formatBytesPerSec } from "../../utils/format";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * IoPanel — the small `io` box showing disk read/write throughput.
 */
export class IoPanel {
  private box: any;

  constructor(
    private screen: any,
    opts: { top: string | number; left: string | number; width: string | number; height: string | number },
  ) {
    this.box = blessed.box({
      parent: screen,
      label: " io ",
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
    const r = formatBytesPerSec(snapshot.io.readBytesPerSec);
    const w = formatBytesPerSec(snapshot.io.writeBytesPerSec);
    this.box.setContent(
      ` {green-fg}▼R{/green-fg} ${r}\n {red-fg}▲W{/red-fg} ${w}`,
    );
    this.screen.render();
  }
}
