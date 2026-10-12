import type { GpuInfo } from "../types";

/** Encapsulates GPU sensor data. */
export class GpuModel {
  constructor(private readonly data: GpuInfo) {}

  static from(info: GpuInfo): GpuModel {
    return new GpuModel(info);
  }

  get model(): string {
    return this.data.model;
  }
  get vendor(): string {
    return this.data.vendor;
  }
  get utilization(): number {
    return this.data.utilization;
  }
  get temperatureC(): number | null {
    return this.data.temperatureC;
  }
  get memoryUsedBytes(): number | null {
    return this.data.memoryUsedBytes;
  }
}
