import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * FooterBar — the bottom hint bar showing keyboard actions and the
 * selected-process counter, matching the reference `select ↓ info terminate`.
 */
export class FooterBar {
  private box: any;

  constructor(
    private screen: any,
    opts: { top: string | number; left: string | number; width: string | number; height: string | number },
  ) {
    this.box = blessed.box({
      parent: screen,
      bottom: 0,
      left: 0,
      width: "100%",
      height: 1,
      tags: true,
      style: { fg: "white", bg: "blue" },
    });
    void opts;
  }

  get element(): any {
    return this.box;
  }

  /** Render the footer with a left hint string and a right counter. */
  render(left: string, right: string): void {
    const width = typeof this.box.width === "number" ? this.box.width : 100;
    const pad = Math.max(1, width - left.length - right.length);
    this.box.setContent(` ${left}${" ".repeat(pad)}${right} `);
    this.screen.render();
  }
}
