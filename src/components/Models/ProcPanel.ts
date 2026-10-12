import type { SystemSnapshot, ProcessInfo } from "../../types";
import { ProcessModel } from "../../models/ProcessModel";
import { SearchEngine } from "../../search/SearchEngine";
import { SortEngine } from "../../sorting/SortEngine";
import { FilterEngine } from "../../filters/FilterEngine";
import { formatBytes } from "../../utils/format";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * ProcPanel — the interactive process (task) table.
 *
 * Renders a btop-style table with columns:
 *   Pid | Program | Command | Threads | User | MemB | CPU%
 * Built on blessed's native `list` element so selection, scrolling and
 * highlight rendering are handled natively; each row is a pre-formatted,
 * color-tagged string. Supports live search, sorting and filtering.
 */
export class ProcPanel {
  private list: any;
  private rows: ProcessModel[] = [];
  private statusText = "";
  private totalProcesses = 0;

  private static readonly W = {
    pid: 7,
    name: 16,
    command: 40,
    threads: 9,
    user: 14,
    mem: 10,
    cpu: 8,
  };

  constructor(
    private screen: any,
    opts: { top: string | number; left: string | number; width: string | number; height: string | number },
    private readonly search: SearchEngine,
    private readonly sort: SortEngine,
    private readonly filter: FilterEngine,
  ) {
    this.list = blessed.list({
      parent: screen,
      label: " proc ",
      top: opts.top,
      left: opts.left,
      width: opts.width,
      height: opts.height,
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      border: { type: "line", fg: darkTheme.borderFg },
      style: {
        fg: darkTheme.text,
        border: { fg: darkTheme.borderFg },
        selected: { bg: darkTheme.selectedBg, fg: darkTheme.selectedFg },
        item: { fg: darkTheme.text },
      },
    });
    this.list.on("focus", () => {
      this.list.style.border = { fg: darkTheme.accent };
      this.screen.render();
    });
    this.list.on("blur", () => {
      this.list.style.border = { fg: darkTheme.borderFg };
      this.screen.render();
    });
  }

  get element(): any {
    return this.list;
  }

  /** Update the table data and re-render. */
  update(snapshot: SystemSnapshot, totalProcesses: number): void {
    this.totalProcesses = totalProcesses;
    let models = (snapshot.processes as ProcessInfo[]).map((p) => new ProcessModel(p));
    models = this.filter.apply(models);
    models = this.search.apply(models);
    models = this.sort.apply(models);

    const prevPid = this.rows[this.selectedIndex()]?.pid;
    this.rows = models;

    const width = typeof this.list.width === "number" ? this.list.width : 100;
    const items = models.map((p) => this.formatRow(p, width));

    const counter = `${models.length}/${totalProcesses}`;
    this.list.setLabel(` proc ${this.sort.indicator()} ${counter}${this.statusText ? "  " + this.statusText : ""} `);
    this.list.setItems([this.formatHeader(width), ...items]);

    if (prevPid != null) {
      const idx = models.findIndex((m) => m.pid === prevPid);
      if (idx >= 0) this.list.select(idx);
    }
    this.screen.render();
  }

  setStatus(text: string): void {
    this.statusText = text;
  }

  private selectedIndex(): number {
    return typeof this.list.selected === "number" ? this.list.selected : 0;
  }

  /** Move selection by `delta`. */
  move(delta: number): void {
    if (this.rows.length === 0) return;
    const next = Math.min(this.rows.length - 1, Math.max(0, this.selectedIndex() + delta));
    this.list.select(next);
    this.screen.render();
  }

  moveToTop(): void {
    if (this.rows.length) {
      this.list.select(0);
      this.screen.render();
    }
  }

  moveToBottom(): void {
    if (this.rows.length) {
      this.list.select(this.rows.length - 1);
      this.screen.render();
    }
  }

  /** Currently selected process (accounts for the header offset). */
  selectedProcess(): ProcessModel | null {
    const idx = this.selectedIndex();
    if (idx <= 0 || idx - 1 >= this.rows.length) return null;
    return this.rows[idx - 1] ?? null;
  }

  focus(): void {
    this.list.focus();
  }

  private formatHeader(width: number): string {
    const w = ProcPanel.W;
    const cmd = this.commandWidth(width);
    return (
      this.pad("Pid", w.pid) +
      this.pad("Program:", w.name) +
      this.pad("Command:", cmd) +
      this.pad("Threads:", w.threads) +
      this.pad("User", w.user) +
      this.pad("MemB", w.mem) +
      this.pad("CPU%", w.cpu)
    );
  }

  private commandWidth(width: number): number {
    const w = ProcPanel.W;
    const used = w.pid + w.name + w.command + w.threads + w.user + w.mem + w.cpu;
    return Math.max(10, w.command + (width - 2 - used));
  }

  private formatRow(proc: ProcessModel, width: number): string {
    const w = ProcPanel.W;
    const cmd = this.commandWidth(width);
    const cpuColor = proc.cpu >= 75 ? "red" : proc.cpu >= 40 ? "yellow" : "green";
    const threads = proc.threads > 0 ? String(proc.threads) : "?";
    const cpuTag = `{${cpuColor}-fg}`;
    const cpuClose = `{/${cpuColor}-fg}`;
    return (
      this.pad(String(proc.pid), w.pid) +
      `{green-fg}${this.pad(proc.name, w.name)}{/green-fg}` +
      `{gray-fg}${this.pad(proc.command, cmd)}{/gray-fg}` +
      this.pad(threads, w.threads) +
      this.pad(proc.user, w.user) +
      this.pad(formatBytes(proc.memBytes, 1), w.mem) +
      `${cpuTag}${this.pad(proc.cpu.toFixed(1), w.cpu - 1)} ${cpuClose}`
    );
  }

  /** Pad a plain string to an exact width (truncating if needed). */
  private pad(text: string, width: number): string {
    const t = this.strip(text);
    if (t.length >= width) return t.slice(0, width);
    return t + " ".repeat(width - t.length);
  }

  /** Remove control characters so width calculations stay accurate. */
  private strip(text: string): string {
    return String(text).replace(/[\r\n]+/g, " ").trim();
  }
}
