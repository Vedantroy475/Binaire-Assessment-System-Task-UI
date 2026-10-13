import type { AuthService } from "./AuthService";
import { AuthError } from "./AuthError";
import type { AuthUser } from "../types";

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
      throw new AuthError(
        "NETWORK_ERROR",
        "Could not reach Firebase. Check your internet connection and try again.",
      );
    }

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

  private mapFirebaseError(body: any): AuthError {
    const raw: string =
      body && body.error && typeof body.error.message === "string"
        ? body.error.message
        : "";

    // Firebase frequently returns error strings like "WEAK_PASSWORD : ..."
    // Extract the primary code prefix before matching:
    const code = raw.split(":")[0].trim();

    switch (code) {
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
          "Password is too weak. Must be at least 6 characters.",
        );
      case "INVALID_EMAIL":
        return new AuthError(
          "INVALID_EMAIL",
          "That email address doesn't look valid. Please check and try again.",
        );
      case "OPERATION_NOT_ALLOWED":
        return new AuthError(
          "OPERATION_NOT_ALLOWED",
          "Email/Password provider is not enabled in your Firebase Console.",
        );
      case "API_KEY_INVALID":
        return new AuthError(
          "API_KEY_INVALID",
          "Invalid Firebase API Key. Please verify your FIREBASE_API_KEY in .env.",
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
          raw ? `Firebase: ${raw}` : "Authentication failed. Please try again.",
        );
    }
  }

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