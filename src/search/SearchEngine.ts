import { ProcessModel } from "../models/ProcessModel";

/**
 * SearchEngine — filters a process list by a free-text query.
 * Kept as a pure logic class so it can be unit-tested independently of the UI.
 */
export class SearchEngine {
  private query = "";

  setQuery(query: string): void {
    this.query = query.trim();
  }

  getQuery(): string {
    return this.query;
  }

  clear(): void {
    this.query = "";
  }

  isActive(): boolean {
    return this.query.length > 0;
  }

  /** Return only the processes matching the current query. */
  apply(processes: ProcessModel[]): ProcessModel[] {
    if (!this.isActive()) return processes;
    return processes.filter((p) => p.matches(this.query));
  }
}
