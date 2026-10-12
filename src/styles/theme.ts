/**
 * Centralized color + style theme approximating the reference btop-style UI.
 * Values are blessed color names so they can be applied to boxes and widgets.
 */

export interface Theme {
  borderFg: string;
  titleFg: string;
  accent: string;
  selectedBg: string;
  selectedFg: string;
  headerBg: string;
  cpu: { low: string; mid: string; high: string };
  memory: string;
  disk: string;
  net: { rx: string; tx: string };
  battery: string;
  gpu: string;
  text: string;
  dim: string;
}

/** Default dark theme matching the reference screenshot's palette. */
export const darkTheme: Theme = {
  borderFg: "green",
  titleFg: "white",
  accent: "cyan",
  selectedBg: "blue",
  selectedFg: "white",
  headerBg: "blue",
  cpu: { low: "green", mid: "yellow", high: "red" },
  memory: "cyan",
  disk: "magenta",
  net: { rx: "green", tx: "red" },
  battery: "green",
  gpu: "yellow",
  text: "white",
  dim: "gray",
};

/** Pick a CPU/memory bar color based on load percentage. */
export function loadColor(
  percent: number,
  cpuColors: Theme["cpu"] = darkTheme.cpu,
): string {
  if (percent >= 75) return cpuColors.high;
  if (percent >= 40) return cpuColors.mid;
  return cpuColors.low;
}
