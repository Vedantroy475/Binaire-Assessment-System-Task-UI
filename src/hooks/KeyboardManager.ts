/**
 * KeyboardManager — a small registry mapping keys to actions for a blessed
 * screen. Supports per-mode key handling so the auth screen and dashboard can
 * each manage their own keybindings.
 */
export type KeyAction = (ch: string | undefined, key: { name?: string; full?: string; ctrl?: boolean; shift?: boolean }) => void;

interface Binding {
  key: string;
  action: KeyAction;
}

export class KeyboardManager {
  private bindings = new Map<string, Binding>();

  /** Register a handler for a key spec, e.g. "up", "down", "C-c", "enter". */
  on(key: string, action: KeyAction): void {
    this.bindings.set(key, { key, action });
  }

  /** Remove a handler. */
  off(key: string): void {
    this.bindings.delete(key);
  }

  /** Remove every registered handler. */
  clear(): void {
    this.bindings.clear();
  }

  /** Normalize a blessed key event into a lookup spec. */
  private static spec(ch: string | undefined, key: { name?: string; full?: string; ctrl?: boolean }): string[] {
    const candidates: string[] = [];
    if (key.ctrl && ch) candidates.push(`C-${ch.toLowerCase()}`);
    if (key.name) candidates.push(key.name);
    if (ch && ch.length === 1) candidates.push(ch.toLowerCase());
    if (key.full) candidates.push(key.full);
    return candidates;
  }

  /** Dispatch a key event to the first matching handler. */
  dispatch(ch: string | undefined, key: { name?: string; full?: string; ctrl?: boolean; shift?: boolean }): boolean {
    for (const spec of KeyboardManager.spec(ch, key)) {
      const binding = this.bindings.get(spec);
      if (binding) {
        binding.action(ch, key);
        return true;
      }
    }
    return false;
  }
}
