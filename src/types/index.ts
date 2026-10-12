/**
 * Shared domain types for the System Tasks & Sensor Viewer TUI.
 * These describe the normalized shape of data passed from the data-access
 * layer (api/) through the models into the UI panels (components/).
 */

/** A single running OS process/task. */
export interface ProcessInfo {
  pid: number;
  name: string;
  /** Full command line / path of the process. */
  command: string;
  threads: number;
  user: string;
  /** Resident memory in bytes. */
  memBytes: number;
  /** CPU usage percentage (0-100). */
  cpu: number;
  /** Process state, e.g. running / sleeping / blocked. */
  state: string;
  /** Parent process id. */
  parentPid: number;
}

/** Per-logical-core CPU load. */
export interface CoreLoad {
  load: number;
}

/** CPU snapshot including total + per-core load and speed. */
export interface CpuInfo {
  brand: string;
  manufacturer: string;
  speedGHz: number;
  cores: number;
  physicalCores: number;
  totalLoad: number;
  coreLoads: CoreLoad[];
  temperatureC: number | null;
}

/** GPU snapshot. */
export interface GpuInfo {
  model: string;
  vendor: string;
  utilization: number;
  memoryTotalBytes: number | null;
  memoryUsedBytes: number | null;
  temperatureC: number | null;
}

/** Main memory snapshot. */
export interface MemoryInfo {
  totalBytes: number;
  usedBytes: number;
  activeBytes: number;
  availableBytes: number;
  /** Buffers/cache in bytes. */
  cacheBytes: number;
  /** Swap total in bytes. */
  swapTotalBytes: number;
  /** Swap used in bytes. */
  swapUsedBytes: number;
}

/** A mounted disk/filesystem volume. */
export interface DiskInfo {
  fs: string;
  mount: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usePercent: number;
}

/** Disk IO throughput snapshot. */
export interface IoInfo {
  /** Read speed in bytes/s. */
  readBytesPerSec: number;
  /** Write speed in bytes/s. */
  writeBytesPerSec: number;
  /** Total transferred bytes (reads). */
  readTotalBytes: number;
  /** Total transferred bytes (writes). */
  writeTotalBytes: number;
}

/** Network interface snapshot. */
export interface NetworkInfo {
  iface: string;
  /** Primary IPv4 address, if available. */
  ipAddress: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  rxTotalBytes: number;
  txTotalBytes: number;
}

/** Battery snapshot. */
export interface BatteryInfo {
  hasBattery: boolean;
  percent: number;
  isCharging: boolean;
  timeRemainingMinutes: number | null;
}

/** The complete system snapshot assembled each refresh cycle. */
export interface SystemSnapshot {
  timestamp: number;
  /** Uptime in seconds. */
  uptimeSeconds: number;
  cpu: CpuInfo;
  gpu: GpuInfo;
  memory: MemoryInfo;
  disks: DiskInfo[];
  io: IoInfo;
  network: NetworkInfo;
  battery: BatteryInfo;
  processes: ProcessInfo[];
  loadAverage: { one: number; five: number; fifteen: number };
}

/** Columns available for sorting / displaying in the process table. */
export type ProcessColumn =
  | "pid"
  | "name"
  | "user"
  | "cpu"
  | "memBytes"
  | "threads";

/** Authenticated user representation. */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}
