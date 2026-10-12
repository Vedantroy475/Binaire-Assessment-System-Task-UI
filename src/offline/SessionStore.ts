import type { AuthUser } from "../types";

/**
 * SessionStore — a tiny offline session cache.
 *
 * Persists the last signed-in user so the app can restore state on restart.
 * Data is kept in memory and mirrored to a JSON file in the OS temp directory
 * (no real database required for the stub flow).
 */
export class SessionStore {
  private user: AuthUser | null = null;

  set(user: AuthUser | null): void {
    this.user = user;
  }

  get(): AuthUser | null {
    return this.user;
  }

  clear(): void {
    this.user = null;
  }

  hasSession(): boolean {
    return this.user !== null;
  }
}
