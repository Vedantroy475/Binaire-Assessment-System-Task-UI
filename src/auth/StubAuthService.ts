import type { AuthService } from "./AuthService";
import { AuthError } from "./AuthError";
import type { AuthUser } from "../types";

/**
 * StubAuthService — a temporary in-memory auth implementation.
 *
 * This lets the dashboard be reviewed without a Firebase project. It accepts
 * any non-empty email/password and mints a local user. Replace this with
 * FirebaseAuthService once real Firebase config is provided (see .env.example).
 */
export class StubAuthService implements AuthService {
  private user: AuthUser | null = null;

  async signIn(email: string, password: string): Promise<AuthUser> {
    if (!email || !password) {
      throw new AuthError("INVALID_INPUT", "Email and password are required.");
    }
    this.user = {
      uid: "stub-uid",
      email,
      displayName: email.split("@")[0] || "user",
    };
    return this.user;
  }

  async signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthUser> {
    if (!email || !password) {
      throw new AuthError("INVALID_INPUT", "Email and password are required.");
    }
    this.user = {
      uid: "stub-uid",
      email,
      displayName: displayName || email.split("@")[0] || "user",
    };
    return this.user;
  }

  async currentUser(): Promise<AuthUser | null> {
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = null;
  }
}
