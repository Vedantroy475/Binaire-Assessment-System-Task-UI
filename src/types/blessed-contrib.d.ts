/**
 * A declared module shim so TypeScript accepts the untyped `blessed-contrib`
 * package. All widgets are treated as blessed nodes with widget-specific
 * methods (`setData`, `setPercent`, `setPct`, `setLabel`, `setBar`).
 */
declare module "blessed-contrib" {
  import type { Widgets } from "blessed";
  export interface ContribWidget extends Widgets.BlessedElement {
    setData?(data: unknown): void;
    setPercent?(n: number): void;
    setPct?(n: number): void;
    setLabel?(text: string): void;
    setBar?(n: number): void;
  }
  interface Contrib {
    line(options?: Record<string, unknown>): ContribWidget;
    bar(options?: Record<string, unknown>): ContribWidget;
    gauge(options?: Record<string, unknown>): ContribWidget;
    stack(options?: Record<string, unknown>): ContribWidget;
    donut(options?: Record<string, unknown>): ContribWidget;
    sparkline(options?: Record<string, unknown>): ContribWidget;
    lcd(options?: Record<string, unknown>): ContribWidget;
    table(options?: Record<string, unknown>): ContribWidget;
    picture(options?: Record<string, unknown>): ContribWidget;
    log(options?: Record<string, unknown>): ContribWidget;
  }
  function factory(options?: { screen?: unknown }): Contrib;
  export = factory;
}
