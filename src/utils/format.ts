/**
 * Formatting helpers used across the TUI to present byte counts, transfer
 * rates, temperatures and percentages in a compact, human-readable form
 * that matches the reference btop-style UI.
 */

const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];

/** Format a raw byte count into a compact binary-prefixed string. */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const fixed = value.toFixed(unitIndex === 0 ? 0 : decimals);
  return `${fixed} ${BYTE_UNITS[unitIndex]}`;
}

/** Format a bytes-per-second rate as e.g. "49 Byte/s" or "1.2 MiB/s". */
export function formatBytesPerSec(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "0 Byte/s";
  let value = bytesPerSec;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const fixed = value.toFixed(unitIndex === 0 ? 0 : 1);
  const unit = unitIndex === 0 ? "Byte" : BYTE_UNITS[unitIndex];
  return `${fixed} ${unit}/s`;
}

/** Format a bit rate as e.g. "392 bits" or "1.5 Mbit/s". */
export function formatBitsPerSec(bytesPerSec: number): string {
  const bits = bytesPerSec * 8;
  const units = ["bit", "Kbit", "Mbit", "Gbit", "Tbit"];
  let value = bits;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}/s`;
}

/** Format a temperature in Celsius, e.g. "48°C". */
export function formatTemp(celsius: number | null | undefined): string {
  if (celsius == null || Number.isNaN(celsius)) return "--°C";
  return `${Math.round(celsius)}°C`;
}

/** Clamp a number between a min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Format a percentage rounded to an integer, e.g. "51%". */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(clamp(value, 0, 100))}%`;
}

/** Format seconds of uptime into a compact "HH:MM:SS" (or "Dd HH:MM:SS"). */
export function formatUptime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "00:00:00";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

/** Format a wall-clock time string from a Date, e.g. "19:42:00". */
export function formatClock(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
