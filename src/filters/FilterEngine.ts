import { ProcessModel } from "../models/ProcessModel";

/** Optional filter criteria applied to the process list. */
export interface FilterCriteria {
  /** Only show processes owned by this user (case-insensitive). Empty = any. */
  user?: string;
  /** Only show processes using at least this CPU percent. */
  minCpu?: number;
  /** Only show processes using at least this memory (bytes). */
  minMemBytes?: number;
}

/**
 * FilterEngine — narrows a process list by user / cpu / memory thresholds.
 * Pure logic class, independent of the UI layer.
 */
export class FilterEngine {
  private criteria: FilterCriteria = {};

  setCriteria(criteria: FilterCriteria): void {
    this.criteria = { ...criteria };
  }

  getCriteria(): FilterCriteria {
    return { ...this.criteria };
  }

  clear(): void {
    this.criteria = {};
  }

  isActive(): boolean {
    const c = this.criteria;
    return (
      (!!c.user && c.user.length > 0) ||
      (c.minCpu ?? 0) > 0 ||
      (c.minMemBytes ?? 0) > 0
    );
  }

  /** Return only the processes satisfying all active criteria. */
  apply(processes: ProcessModel[]): ProcessModel[] {
    const c = this.criteria;
    const user = c.user?.trim().toLowerCase() ?? "";
    const minCpu = c.minCpu ?? 0;
    const minMem = c.minMemBytes ?? 0;
    return processes.filter((p) => {
      if (user && !p.user.toLowerCase().includes(user)) return false;
      if (p.cpu < minCpu) return false;
      if (p.memBytes < minMem) return false;
      return true;
    });
  }
}
