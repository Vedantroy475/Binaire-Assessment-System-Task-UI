import { ProcessModel } from "../models/ProcessModel";
import type { ProcessColumn } from "../types";

/** Human-readable labels for each sortable column. */
export const COLUMN_LABELS: Record<ProcessColumn, string> = {
  pid: "PID",
  name: "Program",
  user: "User",
  cpu: "CPU%",
  memBytes: "Mem",
  threads: "Threads",
};

/**
 * SortEngine — sorts a process list by a chosen column and direction.
 * Pure logic class, independent of the UI layer.
 */
export class SortEngine {
  private column: ProcessColumn = "cpu";
  private descending = true;

  setColumn(column: ProcessColumn): void {
    // Default to descending for numeric columns, ascending for text.
    if (column !== this.column) {
      this.descending = column !== "name" && column !== "user";
    }
    this.column = column;
  }

  toggleDirection(): void {
    this.descending = !this.descending;
  }

  getColumn(): ProcessColumn {
    return this.column;
  }

  isDescending(): boolean {
    return this.descending;
  }

  /** Return a new sorted array (does not mutate input). */
  apply(processes: ProcessModel[]): ProcessModel[] {
    const copy = [...processes];
    copy.sort((a, b) => {
      const cmp = a.compare(b, this.column);
      return this.descending ? -cmp : cmp;
    });
    return copy;
  }

  /** A short indicator such as "CPU% ▼". */
  indicator(): string {
    return `${COLUMN_LABELS[this.column]} ${this.descending ? "▼" : "▲"}`;
  }
}
