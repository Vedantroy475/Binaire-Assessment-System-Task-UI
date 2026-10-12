import type { CpuInfo } from "../types";

/** Encapsulates CPU sensor data and derived helpers (per-core bars, colors). */
export class CpuModel {
  constructor(
    public readonly brand: string,
    public readonly manufacturer: string,
    public readonly speedGHz: number,
    public readonly cores: number,
    public readonly physicalCores: number,
    public readonly totalLoad: number,
    public readonly coreLoads: number[],
    public readonly temperatureC: number | null,
  ) {}

  /** Build a model from the normalized snapshot structure. */
  static from(info: CpuInfo): CpuModel {
    return new CpuModel(
      info.brand,
      info.manufacturer,
      info.speedGHz,
      info.cores,
      info.physicalCores,
      info.totalLoad,
      info.coreLoads.map((c) => c.load),
      info.temperatureC,
    );
  }

  /** Clean, short CPU label for the header, e.g. "i5-6200U". */
  shortBrand(): string {
    // Intel brand strings look like "Intel(R) Core(TM) i5-6200U CPU @ 2.30GHz".
    const match = this.brand.match(/(i[357]-\d{4,5}[A-Z]*)/i);
    if (match) return match[1];
    const cleaned = this.brand
      .replace(/\(R\)|\(TM\)|\(tm\)|\(r\)/g, "")
      .replace(/CPU|@.*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || this.brand;
  }
}
