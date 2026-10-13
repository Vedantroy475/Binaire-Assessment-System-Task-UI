import type { AuthUser } from "../types";
import type { StatsBundle } from "../hooks/useSystemStats";
import { AppLayout } from "../components/Layout/AppLayout";
import { SearchBox } from "../components/Search/SearchBox";
import { SortMenu } from "../components/Sorting/SortMenu";
import { FilterMenu } from "../components/Filters/FilterMenu";
import { SearchEngine } from "../search/SearchEngine";
import { SortEngine } from "../sorting/SortEngine";
import { FilterEngine } from "../filters/FilterEngine";
import { KeyboardManager } from "../hooks/KeyboardManager";
import { useSystemStats } from "../hooks/useSystemStats";

declare const blessed: any;

export class DashboardPage {
  private layout: AppLayout;
  private searchBox: SearchBox;
  private sortMenu: SortMenu;
  private filterMenu: FilterMenu;
  private keys = new KeyboardManager();
  private lastBundle: StatsBundle | null = null;
  private user: AuthUser | null;
  private activeModal: any | null = null;

  constructor(
    private screen: any,
    contrib: any,
    private readonly stats: useSystemStats,
    user: AuthUser | null,
    private readonly search: SearchEngine,
    private readonly sort: SortEngine,
    private readonly filter: FilterEngine,
  ) {
    this.user = user;

    this.layout = new AppLayout(screen, contrib, search, sort, filter);
    this.searchBox = new SearchBox(screen, search);
    this.sortMenu = new SortMenu(screen, sort);
    this.filterMenu = new FilterMenu(screen, filter);

    this.patchMenuRefresh();
    this.bindKeys();
    this.layout.proc.focus();
    this.renderFooter();
  }

  private patchMenuRefresh(): void {
    for (const menu of [this.searchBox, this.sortMenu, this.filterMenu]) {
      const originalClose = menu.close.bind(menu);
      menu.close = () => {
        originalClose();
        this.refreshFromMenu();
      };
    }
  }

  // --- Keyboard wiring -------------------------------------------------------

  private anyMenuOpen(): boolean {
    return (
      this.activeModal !== null ||
      this.searchBox.isActive() ||
      this.sortMenu.isActive() ||
      this.filterMenu.isActive()
    );
  }

  private bindKeys(): void {
    this.keys.on("q", () => this.quit());
    this.keys.on("C-c", () => this.quit());
    this.keys.on("escape", () => {
      if (this.anyMenuOpen()) return;
      this.quit();
    });

    this.keys.on("up", () => this.layout.proc.move(-1));
    this.keys.on("down", () => this.layout.proc.move(1));
    this.keys.on("k", () => this.layout.proc.move(-1));
    this.keys.on("j", () => this.layout.proc.move(1));
    this.keys.on("g", () => this.layout.proc.moveToTop());
    this.keys.on("G", () => this.layout.proc.moveToBottom());
    this.keys.on("pagedown", () => this.layout.proc.move(10));
    this.keys.on("pageup", () => this.layout.proc.move(-10));

    this.keys.on("/", () => this.searchBox.open());
    this.keys.on("s", () => this.sortMenu.open());
    this.keys.on("f", () => this.filterMenu.open());
    this.keys.on("F", () => {
      this.filter.clear();
      this.refreshFromMenu();
    });
    this.keys.on("enter", () => this.showInfo());
    this.keys.on("i", () => this.showInfo());
    this.keys.on("t", () => this.confirmTerminate());
    this.keys.on("S", () => this.layout.proc.focus());

    this.screen.on(
      "keypress",
      (
        ch: string,
        key: { name?: string; full?: string; ctrl?: boolean; shift?: boolean },
      ) => {
        if (this.anyMenuOpen()) return;
        this.keys.dispatch(ch, key);
      },
    );
  }

  private quit(): void {
    this.stats.stop();
    try {
      this.screen.destroy();
    } catch {
      /* ignore */
    }
    process.stdout.write("\x1b[?1049l");
    process.exit(0);
  }

  // --- Data / rendering ------------------------------------------------------

  onStats(bundle: StatsBundle): void {
    this.lastBundle = bundle;
    this.redraw();
  }

  private redraw(): void {
    if (!this.lastBundle) return;
    this.layout.render(this.lastBundle.snapshot, this.lastBundle.totalProcesses);
    this.renderFooter();
  }

  private renderFooter(): void {
    const selected = this.layout.proc.selectedProcess();
    const counter = selected ? ` ${selected.pid} ` : " 0 ";
    const base =
      " select ↑↓  info:enter/i  terminate:t  search:/  sort:s  filter:f  quit:q";
    const left = this.user ? ` ${this.user.email} ▸${base}` : base;
    this.layout.renderFooter(left, counter);
  }

  refreshFromMenu(): void {
    this.redraw();
    this.renderFooter();
  }

  focusProc(): void {
    this.layout.proc.focus();
  }

  // --- Actions ---------------------------------------------------------------

  private showInfo(): void {
    if (this.activeModal) return;
    const proc = this.layout.proc.selectedProcess();
    if (!proc) return;
    const raw = proc.raw();
    const lines = [
      `{bold}Pid:{/bold} ${raw.pid}      {bold}Parent:{/bold} ${raw.parentPid}`,
      `{bold}Program:{/bold} ${raw.name}`,
      `{bold}Command:{/bold} ${raw.command || raw.name}`,
      `{bold}User:{/bold} ${raw.user}   {bold}State:{/bold} ${raw.state}`,
      `{bold}CPU:{/bold} ${raw.cpu.toFixed(1)}%   {bold}Mem:{/bold} ${raw.memBytes} B`,
      "",
      "{gray-fg}[ Esc / q / Enter / Backspace to close ]{/gray-fg}",
    ];
    this.modal(" Process Info ", 64, lines.length + 2, lines);
  }

  private confirmTerminate(): void {
    if (this.activeModal) return;
    const proc = this.layout.proc.selectedProcess();
    if (!proc) return;

    const box = blessed.box({
      parent: this.screen,
      label: ` terminate pid ${proc.pid}? `,
      top: "center",
      left: "center",
      width: 48,
      height: 8,
      tags: true,
      border: { type: "line", fg: "red" },
      style: { border: { fg: "red" } },
      keys: true,
    });

    blessed.text({
      parent: box,
      top: 1,
      left: 2,
      right: 2,
      height: 3,
      tags: true,
      content: ` {bold}${proc.name}{/bold} (${proc.pid})\n Kill this process? [y/N]\n {gray-fg}[Esc / n to cancel]{/gray-fg}`,
      style: { fg: "white" },
    });

    this.activeModal = box;
    box.focus();

    box.on("keypress", (ch: string, key: { name?: string }) => {
      if (ch === "y" || ch === "Y") {
        this.terminate(proc.pid);
        this.closeModal(box);
      } else if (
        key?.name === "escape" ||
        key?.name === "enter" ||
        ch === "n" ||
        ch === "N" ||
        ch === "q"
      ) {
        this.closeModal(box);
      }
      this.screen.render();
    });

    box.setFront();
    this.screen.render();
  }

  private terminate(pid: number): void {
    try {
      process.kill(pid);
    } catch {
      /* ignore: process may have exited or be privileged */
    }
    this.layout.proc.setStatus(`terminated ${pid}`);
    void this.stats.poll();
  }

  private modal(
    label: string,
    width: number,
    height: number,
    contentLines: string[],
  ): void {
    const box = blessed.box({
      parent: this.screen,
      label,
      top: "center",
      left: "center",
      width,
      height,
      tags: true,
      border: { type: "line", fg: "cyan" },
      style: { border: { fg: "cyan" } },
      keys: true,
    });

    blessed.text({
      parent: box,
      top: 1,
      left: 2,
      right: 2,
      tags: true,
      content: contentLines.join("\n"),
      style: { fg: "white" },
    });

    this.activeModal = box;
    box.focus();

    box.on("keypress", (ch: string, key: { name?: string }) => {
      if (
        key?.name === "escape" ||
        key?.name === "enter" ||
        key?.name === "backspace" ||
        ch === "q" ||
        ch === "x"
      ) {
        this.closeModal(box);
      }
      this.screen.render();
    });

    box.setFront();
    this.screen.render();
  }

  private closeModal(box: any): void {
    this.activeModal = null;
    this.screen.remove(box);
    box.destroy?.();
    this.layout.proc.focus();
    this.screen.render();
  }
}