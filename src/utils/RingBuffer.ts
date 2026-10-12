/**
 * RingBuffer — a fixed-capacity buffer used to keep a rolling window of
 * samples (e.g. CPU load history) for streaming line charts.
 */
export class RingBuffer {
  private items: number[] = [];
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity > 0 ? capacity : 1;
  }

  /** Append a value, evicting the oldest once capacity is exceeded. */
  push(value: number): void {
    this.items.push(value);
    if (this.items.length > this.capacity) {
      this.items.splice(0, this.items.length - this.capacity);
    }
  }

  /** Return a copy of the current contents, oldest first. */
  toArray(): number[] {
    return [...this.items];
  }

  /** Replace contents (used when capacity shrinks on resize). */
  resize(capacity: number): void {
    this.capacity = Math.max(1, capacity);
    if (this.items.length > this.capacity) {
      this.items.splice(0, this.items.length - this.capacity);
    }
  }

  get length(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
