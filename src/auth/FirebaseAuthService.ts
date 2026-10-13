import type { AuthService } from "./AuthService";
import { AuthError } from "./AuthError";
import type { AuthUser } from "../types";

/**
 * FirebaseAuthService — Firebase Authentication (Email/Password) implemented
 * against the Identity Platform REST API using Node's built-in `fetch`.
 *
 * Security notes:
 *  - Only the public web API key is used; it is a project identifier, not a
 *    secret. It must never be confused with a privileged service-account key.
 *  - The Firebase Admin SDK / service-account private keys are intentionally
 *    NOT used: this is a distributed CLI with no trusted backend.
 *  - Passwords and tokens (idToken / refreshToken) are never logged or stored.
 *  - The REST response may contain idToken/refreshToken; those fields are read
 *    into a local variable only to build the user, then discarded. No token is
 *    persisted to disk or kept in memory beyond the session's AuthUser.
 */
interface FirebaseConfig {
  apiKey: string;
}

const IDENTITY_TOOLKIT = "https://identitytoolkit.googleapis.com/v1";

export class FirebaseAuthService implements AuthService {
  private user: AuthUser | null = null;

  constructor(private readonly config: FirebaseConfig) {
    if (!config || !config.apiKey || config.apiKey.trim() === "") {
      throw new AuthError(
        "MISSING_CONFIG",
        "FIREBASE_API_KEY is not set. Copy .env.example to .env and add your " +
          "Firebase web API key (Firebase Console -> Project settings -> Web API Key).",
      );
    }
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const data = await this.post("accounts:signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
    return this.toUser(data);
  }

  async signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthUser> {
    const data = await this.post("accounts:signUp", {
      email,
      password,
      displayName,
      returnSecureToken: true,
    });
    return this.toUser(data, displayName);
  }

  async currentUser(): Promise<AuthUser | null> {
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = null;
  }

  /**
   * POST to an Identity Toolkit endpoint and return the parsed JSON body.
   * All failures (network or Firebase error responses) are converted to a
   * user-friendly AuthError. Neither the URL (which contains the API key) nor
   * the request/response bodies (which contain tokens) are ever logged.
   */
  private async post(
    endpoint: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${IDENTITY_TOOLKIT}/${endpoint}?key=${encodeURIComponent(
      this.config.apiKey,
    )}`;

    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Network failure / DNS / offline. The URL is intentionally omitted from
      // the message because it contains the API key.
      throw new AuthError(
        "NETWORK_ERROR",
        "Could not reach Firebase. Check your internet connection and try again.",
      );
    }

    // Parse the JSON body once. It may contain idToken/refreshToken, so it is
    // only ever inspected for the error code and the user identifiers.
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok || !body || typeof body !== "object") {
      throw this.mapFirebaseError(body);
    }

    return body as Record<string, unknown>;
  }

  /** Map an Identity Platform error response to a friendly AuthError. */
  private mapFirebaseError(body: any): AuthError {
    const raw: string =
      body && body.error && typeof body.error.message === "string"
        ? body.error.message
        : "";

    switch (raw) {
      case "EMAIL_EXISTS":
        return new AuthError(
          "EMAIL_EXISTS",
          "An account with this email already exists. Try signing in instead.",
        );
      case "EMAIL_NOT_FOUND":
        return new AuthError(
          "EMAIL_NOT_FOUND",
          "No account was found for this email. Please sign up first.",
        );
      case "INVALID_PASSWORD":
      case "INVALID_LOGIN_CREDENTIALS":
        return new AuthError(
          "INVALID_LOGIN_CREDENTIALS",
          "Incorrect email or password. Please try again.",
        );
      case "WEAK_PASSWORD":
        return new AuthError(
          "WEAK_PASSWORD",
          "Password is too weak. Please choose a stronger password.",
        );
      case "INVALID_EMAIL":
        return new AuthError(
          "INVALID_EMAIL",
          "That email address doesn't look valid. Please check and try again.",
        );
      case "USER_DISABLED":
        return new AuthError(
          "USER_DISABLED",
          "This account has been disabled. Contact support for help.",
        );
      case "TOO_MANY_ATTEMPTS_TRY_LATER":
        return new AuthError(
          "TOO_MANY_ATTEMPTS_TRY_LATER",
          "Too many attempts. Please wait a moment and try again.",
        );
      default:
        return new AuthError(
          "UNKNOWN",
          "Authentication failed. Please try again.",
        );
    }
  }

  /** Build an AuthUser from a successful Identity Platform response. */
  private toUser(
    body: Record<string, unknown>,
    fallbackName?: string,
  ): AuthUser {
    const email = typeof body.email === "string" ? body.email : "";
    const uid = typeof body.localId === "string" ? body.localId : "";
    const displayName =
      fallbackName && fallbackName.trim() !== ""
        ? fallbackName
        : email.split("@")[0] || "user";
    this.user = { uid, email, displayName };
    return this.user;
  }
}
