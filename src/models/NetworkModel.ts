import type { NetworkInfo } from "../types";
import { formatBitsPerSec, formatBytes, formatBytesPerSec } from "../utils/format";

/** Encapsulates a network interface's throughput snapshot. */
export class NetworkModel {
  constructor(private readonly data: NetworkInfo) {}

  static from(info: NetworkInfo): NetworkModel {
    return new NetworkModel(info);
  }

  get iface(): string {
    return this.data.iface;
  }
  get ipAddress(): string {
    return this.data.ipAddress;
  }
  get rxBytesPerSec(): number {
    return this.data.rxBytesPerSec;
  }
  get txBytesPerSec(): number {
    return this.data.txBytesPerSec;
  }
  get rxTotalBytes(): number {
    return this.data.rxTotalBytes;
  }
  get txTotalBytes(): number {
    return this.data.txTotalBytes;
  }

  /** e.g. "49 Byte/s (392 bits)" */
  rxLabel(): string {
    return `${formatBytesPerSec(this.rxBytesPerSec)} (${formatBitsPerSec(this.rxBytesPerSec)})`;
  }
  /** e.g. "49 Byte/s (392 bits)" */
  txLabel(): string {
    return `${formatBytesPerSec(this.txBytesPerSec)} (${formatBitsPerSec(this.txBytesPerSec)})`;
  }
  rxTotalLabel(): string {
    return `Total: ${formatBytes(this.rxTotalBytes)}`;
  }
  txTotalLabel(): string {
    return `Total: ${formatBytes(this.txTotalBytes)}`;
  }
}
