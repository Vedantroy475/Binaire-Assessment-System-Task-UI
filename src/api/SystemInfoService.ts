import * as si from "systeminformation";
import type {
  BatteryInfo,
  CpuInfo,
  DiskInfo,
  IoInfo,
  MemoryInfo,
  NetworkInfo,
  SystemSnapshot,
  GpuInfo,
} from "../types";

/**
 * SystemInfoService — the data-access layer for SENSOR information.
 *
 * Wraps the `systeminformation` library and normalizes its output into the
 * strongly-typed domain interfaces consumed by the models and UI panels.
 * Every sensor call is guarded so a failing probe on a given platform degrades
 * gracefully instead of crashing the TUI.
 *
 * Note: this class is intentionally separate from the process/task layer
 * (ProcessService) and from the UI layer (blessed) so that no single library
 * is responsible for UI + task fetching + sensors.
 */
export class SystemInfoService {
  /** Fetch a fully normalized snapshot of all sensor data. */
  async snapshot(): Promise<SystemSnapshot> {
    const [cpu, load, cpuSpeed, cpuTemp, mem, disks, fsStats, netStats, netIfaces, gpu, battery, time] =
      await Promise.all([
        this.safe(() => si.cpu(), null),
        this.safe(() => si.currentLoad(), null),
        this.safe(() => si.cpuCurrentSpeed(), null),
        this.safe(() => si.cpuTemperature(), null),
        this.safe(() => si.mem(), null),
        this.safe(() => si.fsSize(), [] as si.Systeminformation.FsSizeData[]),
        this.safe(() => si.fsStats(), null),
        this.safe(() => si.networkStats(), [] as si.Systeminformation.NetworkStatsData[]),
        this.safe(() => si.networkInterfaces(), [] as si.Systeminformation.NetworkInterfacesData[]),
        this.safe(() => si.graphics(), null),
        this.safe(() => si.battery(), null),
        this.safe<si.Systeminformation.TimeData | null>(async () => await si.time(), null),
      ]);

    return {
      timestamp: Date.now(),
      uptimeSeconds: time?.uptime ?? 0,
      cpu: this.mapCpu(cpu, load, cpuSpeed, cpuTemp),
      gpu: this.mapGpu(gpu),
      memory: this.mapMemory(mem),
      disks: this.mapDisks(disks),
      io: this.mapIo(fsStats),
      network: this.mapNetwork(netStats, netIfaces),
      battery: this.mapBattery(battery),
      processes: [], // populated by ProcessService
      loadAverage: this.mapLoadAverage(load),
    };
  }

  // --- Normalization helpers -------------------------------------------------

  private mapCpu(
    cpu: si.Systeminformation.CpuData | null,
    load: si.Systeminformation.CurrentLoadData | null,
    cpuSpeed: si.Systeminformation.CpuCurrentSpeedData | null,
    cpuTemp: si.Systeminformation.CpuTemperatureData | null,
  ): CpuInfo {
    const coreLoads = (load?.cpus ?? []).map((c) => ({ load: this.num(c?.load) }));
    return {
      brand: cpu?.brand ?? "CPU",
      manufacturer: cpu?.manufacturer ?? "",
      speedGHz: this.ghz(cpuSpeed?.avg ?? cpu?.speed ?? 0),
      cores: cpu?.cores ?? coreLoads.length ?? 1,
      physicalCores: cpu?.physicalCores ?? cpu?.cores ?? 1,
      totalLoad: this.num(load?.currentLoad ?? 0),
      coreLoads: coreLoads.length ? coreLoads : [{ load: 0 }],
      temperatureC:
        cpuTemp && typeof cpuTemp.main === "number" && cpuTemp.main > 0 ? cpuTemp.main : null,
    };
  }

  private mapMemory(mem: si.Systeminformation.MemData | null): MemoryInfo {
    return {
      totalBytes: this.num(mem?.total),
      usedBytes: this.num(mem?.used),
      activeBytes: this.num(mem?.active),
      availableBytes: this.num(mem?.available),
      cacheBytes: this.num(mem?.buffcache ?? mem?.cached ?? 0),
      swapTotalBytes: this.num(mem?.swaptotal),
      swapUsedBytes: this.num(mem?.swapused),
    };
  }

  private mapDisks(disks: si.Systeminformation.FsSizeData[]): DiskInfo[] {
    return disks
      .filter((d) => d && d.size > 0)
      .map((d) => ({
        fs: d.fs ?? "",
        mount: d.mount ?? "",
        totalBytes: this.num(d.size),
        usedBytes: this.num(d.used),
        availableBytes: this.num(d.available),
        usePercent: this.num(d.use),
      }));
  }

  private mapIo(fsStats: si.Systeminformation.FsStatsData | null): IoInfo {
    return {
      readBytesPerSec: this.num(fsStats?.rx_sec),
      writeBytesPerSec: this.num(fsStats?.wx_sec),
      readTotalBytes: this.num(fsStats?.rx),
      writeTotalBytes: this.num(fsStats?.wx),
    };
  }

  private mapNetwork(
    netStats: si.Systeminformation.NetworkStatsData[],
    netIfaces: si.Systeminformation.NetworkInterfacesData[],
  ): NetworkInfo {
    const stats = Array.isArray(netStats) ? netStats : [];
    const ifaceIp = new Map<string, string>();
    for (const itf of netIfaces) {
      if (itf?.iface && itf?.ip4 && !itf.ip4.startsWith("127.")) {
        ifaceIp.set(itf.iface, itf.ip4);
      }
    }
    const chosen =
      stats.find((s) => ifaceIp.has(s.iface) && (s.rx_sec || s.tx_sec)) ??
      stats.find((s) => ifaceIp.has(s.iface)) ??
      stats[0];

    return {
      iface: chosen?.iface ?? "eth",
      ipAddress: chosen ? ifaceIp.get(chosen.iface) ?? "0.0.0.0" : "0.0.0.0",
      rxBytesPerSec: this.num(chosen?.rx_sec),
      txBytesPerSec: this.num(chosen?.tx_sec),
      rxTotalBytes: this.num(chosen?.rx_bytes),
      txTotalBytes: this.num(chosen?.tx_bytes),
    };
  }

  private mapGpu(graphics: si.Systeminformation.GraphicsData | null): GpuInfo {
    const ctrl = graphics?.controllers?.[0];
    return {
      model: ctrl?.model || "GPU",
      vendor: ctrl?.vendor || "",
      utilization: 0,
      memoryTotalBytes: ctrl?.vram && ctrl.vram > 0 ? ctrl.vram * 1024 * 1024 : null,
      memoryUsedBytes: null,
      temperatureC: null,
    };
  }

  private mapBattery(battery: si.Systeminformation.BatteryData | null): BatteryInfo {
    if (!battery || !battery.hasBattery) {
      return { hasBattery: false, percent: 0, isCharging: false, timeRemainingMinutes: null };
    }
    return {
      hasBattery: true,
      percent: this.num(battery.percent),
      isCharging: !!battery.isCharging,
      timeRemainingMinutes:
        typeof battery.timeRemaining === "number" && battery.timeRemaining > 0
          ? battery.timeRemaining
          : null,
    };
  }

  private mapLoadAverage(load: si.Systeminformation.CurrentLoadData | null) {
    const raw = load?.avgLoad ?? 0;
    const one = typeof raw === "number" ? raw : 0;
    return { one, five: one, fifteen: one };
  }

  // --- Small utilities -------------------------------------------------------

  private num(v: number | null | undefined): number {
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  }

  /** Convert a CPU speed to GHz rounded to 2dp. */
  private ghz(v: number): number {
    const n = this.num(v);
    return n > 100 ? Number((n / 1000).toFixed(2)) : Number(n.toFixed(2));
  }

  /** Run a probe and swallow any error, returning the fallback value. */
  private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }
}
