import { SortEngine, COLUMN_LABELS } from "../../sorting/SortEngine";
import type { ProcessColumn } from "../../types";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * SortMenu — a small overlay list to pick the process-table sort column.
 */
export class SortMenu {
  private box: any;
  private list: any;
  private active = false;

  private static readonly COLUMNS: ProcessColumn[] = ["pid", "name", "user", "cpu", "memBytes", "threads"];

  constructor(
    private screen: any,
    private readonly sort: SortEngine,
  ) {
    this.box = blessed.box({
      parent: screen,
      label: " sort by ",
      top: "center",
      left: "center",
      width: 24,
      height: SortMenu.COLUMNS.length + 2,
      hidden: true,
      tags: true,
      border: { type: "line", fg: darkTheme.accent },
      style: { border: { fg: darkTheme.accent } },
    });

    this.list = blessed.list({
      parent: this.box,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: { bg: darkTheme.selectedBg, fg: darkTheme.selectedFg },
        item: { fg: darkTheme.text },
      },
      items: SortMenu.COLUMNS.map((c) => ` ${COLUMN_LABELS[c]}`),
    });

    this.list.on("select", (_: unknown, i: number) => {
      this.sort.setColumn(SortMenu.COLUMNS[i]);
      this.close();
    });
    this.list.key("escape", () => this.close());
  }

  open(): void {
    this.active = true;
    this.box.show();
    this.box.setFront();
    const idx = SortMenu.COLUMNS.indexOf(this.sort.getColumn());
    this.list.select(idx >= 0 ? idx : 0);
    this.list.focus();
    this.screen.render();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.box.hide();
    this.screen.restoreFocus();
    this.screen.render();
  }

  isActive(): boolean {
    return this.active;
  }
}
