import type { BatteryInfo } from "../types";

/** Encapsulates battery status. */
export class BatteryModel {
  constructor(private readonly data: BatteryInfo) {}

  static from(info: BatteryInfo): BatteryModel {
    return new BatteryModel(info);
  }

  get hasBattery(): boolean {
    return this.data.hasBattery;
  }
  get percent(): number {
    return this.data.percent;
  }
  get isCharging(): boolean {
    return this.data.isCharging;
  }
  get timeRemainingMinutes(): number | null {
    return this.data.timeRemainingMinutes;
  }

  /** e.g. "BAT 100%" or "BAT --" when no battery, with a charging marker. */
  label(): string {
    if (!this.data.hasBattery) return "BAT --";
    const mark = this.data.isCharging ? "^" : "";
    return `BAT ${mark}${Math.round(this.data.percent)}%`;
  }
}
