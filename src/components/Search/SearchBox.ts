import { SearchEngine } from "../../search/SearchEngine";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * SearchBox — an inline prompt used to type a process search query.
 * Shown as a small overlay box; live-updates the SearchEngine.
 */
export class SearchBox {
  private box: any;
  private input: any;
  private active = false;

  constructor(
    private screen: any,
    private readonly search: SearchEngine,
  ) {
    this.box = blessed.box({
      parent: screen,
      label: " / search ",
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

  /** Show the search prompt and focus it. */
  open(): void {
    this.active = true;
    this.box.show();
    this.box.setFront();
    this.input.setValue(this.search.getQuery());
    this.input.focus();
    this.screen.render();
  }

  /** Hide the prompt and apply the typed query. */
  close(): void {
    if (!this.active) return;
    this.active = false;
    this.search.setQuery(this.input.getValue() ?? "");
    this.box.hide();
    this.screen.restoreFocus();
    this.screen.render();
  }

  isActive(): boolean {
    return this.active;
  }
}
