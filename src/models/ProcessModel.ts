import type { ProcessInfo, ProcessColumn } from "../types";

/**
 * Represents a single OS process/task in a normalized, UI-friendly form.
 * Encapsulates comparison (for sorting) and matching (for search) logic so the
 * process table and its engines can operate on a consistent object model.
 */
export class ProcessModel {
  constructor(private readonly data: ProcessInfo) {}

  get pid(): number {
    return this.data.pid;
  }
  get name(): string {
    return this.data.name;
  }
  get command(): string {
    return this.data.command;
  }
  get threads(): number {
    return this.data.threads;
  }
  get user(): string {
    return this.data.user;
  }
  get memBytes(): number {
    return this.data.memBytes;
  }
  get cpu(): number {
    return this.data.cpu;
  }
  get state(): string {
    return this.data.state;
  }
  get parentPid(): number {
    return this.data.parentPid;
  }

  /** Return a shallow copy of the underlying raw info. */
  raw(): ProcessInfo {
    return { ...this.data };
  }

  /** Case-insensitive match against program name and command line. */
  matches(query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      this.data.name.toLowerCase().includes(q) ||
      this.data.command.toLowerCase().includes(q) ||
      String(this.data.pid).includes(q) ||
      this.data.user.toLowerCase().includes(q)
    );
  }

  /** Compare this process against another by a given column. */
  compare(other: ProcessModel, column: ProcessColumn): number {
    switch (column) {
      case "pid":
        return this.pid - other.pid;
      case "name":
        return this.name.localeCompare(other.name);
      case "user":
        return this.user.localeCompare(other.user);
      case "cpu":
        return this.cpu - other.cpu;
      case "memBytes":
        return this.memBytes - other.memBytes;
      case "threads":
        return this.threads - other.threads;
      default:
        return 0;
    }
  }
}
