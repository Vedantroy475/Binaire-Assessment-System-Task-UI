import { FilterEngine } from "../../filters/FilterEngine";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * FilterMenu — a small overlay to filter the process list by user.
 * Toggles "all users" vs a specific user substring.
 */
export class FilterMenu {
  private box: any;
  private input: any;
  private active = false;

  constructor(
    private screen: any,
    private readonly filter: FilterEngine,
  ) {
    this.box = blessed.box({
      parent: screen,
      label: " filter by user ",
      top: "center",
      left: "center",
      width: "50%",
      height: 5,
      hidden: true,
      tags: true,
      border: { type: "line", fg: darkTheme.accent },
      style: { border: { fg: darkTheme.accent } },
    });

    this.input = blessed.textbox({
      parent: this.box,
      top: 1,
      left: 1,
      right: 1,
      height: 1,
      inputOnFocus: true,
      keys: true,
      style: { fg: darkTheme.text },
    });

    this.input.key("enter", () => this.close());
    this.input.key("escape", () => this.close());
    this.input.on("submit", () => this.close());
  }

  open(): void {
    this.active = true;
    this.box.show();
    this.box.setFront();
    this.input.setValue(this.filter.getCriteria().user ?? "");
    this.input.focus();
    this.screen.render();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.filter.setCriteria({ ...this.filter.getCriteria(), user: this.input.getValue() ?? "" });
    this.box.hide();
    this.screen.restoreFocus();
    this.screen.render();
  }

  /** Clear any active filter. */
  reset(): void {
    this.filter.clear();
  }

  isActive(): boolean {
    return this.active;
  }
}
