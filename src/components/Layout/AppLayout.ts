import type { SystemSnapshot } from "../../types";
import { CpuPanel } from "../Models/CpuPanel";
import { CorePanel } from "../Models/CorePanel";
import { MemoryPanel } from "../Models/MemoryPanel";
import { NetPanel } from "../Models/NetPanel";
import { IoPanel } from "../Models/IoPanel";
import { HeaderPanel } from "../Models/HeaderPanel";
import { ProcPanel } from "../Models/ProcPanel";
import { FooterBar } from "./FooterBar";
import { SearchEngine } from "../../search/SearchEngine";
import { SortEngine } from "../../sorting/SortEngine";
import { FilterEngine } from "../../filters/FilterEngine";

declare const blessed: any;

/**
 * AppLayout — composes the full dashboard grid and keeps it responsive.
 *
 * Layout (approximates the reference btop UI):
 *   ┌───────────────────────── header ──────────────────────────┐
 *   │ cpu/gpu graph (wide)          │  cores summary (right)     │
 *   ├───────────┬─────────┬─────────┴───────────────────────────┤
 *   │ mem       │ disks   │ io │  proc table (wide, flexible)   │
 *   ├───────────┴─────────┴────┴────────────────────────────────┤
 *   │ net                                                    │
 *   └──────────────────────── footer ────────────────────────────┘
 */
export class AppLayout {
  header!: HeaderPanel;
  cpu!: CpuPanel;
  cores!: CorePanel;
  memory!: MemoryPanel;
  io!: IoPanel;
  net!: NetPanel;
  proc!: ProcPanel;
  footer!: FooterBar;

  constructor(
    private screen: any,
    private contrib: any,
    private readonly search: SearchEngine,
    private readonly sort: SortEngine,
    private readonly filter: FilterEngine,
  ) {
    this.build();
    screen.on("resize", () => this.relayout());
  }

  private build(): void {
    const W = even(this.screen.width as number);
    const H = this.screen.height as number;

    const headerH = 1;
    const footerH = 1;
    const coreW = even(Math.max(28, Math.min(40, Math.floor(W * 0.28))));
    const leftW = Math.max(20, W - coreW);

    // Top strip: cpu graph (left) + cores (right)
    const cpuH = Math.max(6, Math.floor((H - headerH - footerH) * 0.35));

    this.header = new HeaderPanel(this.screen, { top: 0, left: 0, width: W, height: headerH });
    this.cpu = new CpuPanel(this.screen, this.contrib, {
      top: headerH, left: 0, width: even(leftW), height: cpuH,
    });
    this.cores = new CorePanel(this.screen, {
      top: headerH, left: even(leftW), width: coreW, height: cpuH,
    });

    // Middle strip: mem + disks + io (left column) + proc table (right)
    const netH = 6;
    const midTop = headerH + cpuH;
    const midH = H - headerH - cpuH - footerH - netH;

    const memW = even(Math.floor(leftW * 0.34));
    const diskW = even(Math.floor(leftW * 0.34));
    const ioW = Math.max(8, leftW - memW - diskW);

    this.memory = new MemoryPanel(this.screen, this.contrib, {
      mem: { top: midTop, left: 0, width: memW, height: midH },
      disk: { top: midTop, left: memW, width: diskW, height: midH },
    });
    this.io = new IoPanel(this.screen, {
      top: midTop, left: memW + diskW, width: ioW, height: midH,
    });
    this.proc = new ProcPanel(this.screen, {
      top: midTop, left: leftW, width: Math.max(20, W - leftW), height: midH,
    }, this.search, this.sort, this.filter);

    // Bottom strip: network (full width)
    this.net = new NetPanel(this.screen, this.contrib, {
      top: midTop + midH, left: 0, width: W, height: netH,
    });

    this.footer = new FooterBar(this.screen, {
      top: H - footerH, left: 0, width: W, height: footerH,
    });
  }

  /** Recompute and apply positions after a terminal resize. */
  private relayout(): void {
    // Rebuilding is simplest and robust for a fixed grid.
    this.destroyChildren();
    this.build();
    this.screen.render();
  }

  /** Remove every managed child so the grid can be rebuilt cleanly. */
  private children(): any[] {
    const out: any[] = [];
    const push = (el: any) => el && out.push(el);
    push(this.header?.element);
    push(this.cpu?.element);
    push(this.cores?.element);
    for (const el of this.memory?.elements ?? []) push(el);
    push(this.io?.element);
    push(this.proc?.element);
    for (const el of this.net?.elements ?? []) push(el);
    push(this.footer?.element);
    return out;
  }

  private destroyChildren(): void {
    for (const child of this.children()) {
      this.screen.remove(child);
      child.destroy?.();
    }
  }

  /** Push a fresh snapshot into every panel. */
  render(snapshot: SystemSnapshot, totalProcesses: number): void {
    this.header.update(snapshot);
    this.cpu.update(snapshot);
    this.cores.update(snapshot);
    this.memory.update(snapshot);
    this.io.update(snapshot);
    this.proc.update(snapshot, totalProcesses);
    this.net.update(snapshot);
    this.screen.render();
  }

  /** Render the footer hints. */
  renderFooter(left: string, right: string): void {
    this.footer.render(left, right);
  }
}

/** Round a number down to the nearest even integer (canvas widgets need even widths). */
function even(n: number): number {
  const v = Math.max(0, Math.floor(n));
  return v - (v % 2);
}

