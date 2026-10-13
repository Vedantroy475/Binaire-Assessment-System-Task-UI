/**
 * AuthError — a typed authentication error.
 *
 * Thrown by AuthService implementations (Firebase and stub) instead of
 * returning null, so the UI can present specific, user-friendly messages.
 *
 * - `code` is a stable, provider-agnostic identifier for programmatic checks.
 * - `message` is always safe to display in the terminal: it never contains
 *   secrets, tokens, passwords, or raw Firebase API responses.
 */
export type AuthErrorCode =
  | "EMAIL_EXISTS"
  | "WEAK_PASSWORD"
  | "INVALID_LOGIN_CREDENTIALS"
  | "EMAIL_NOT_FOUND"
  | "INVALID_EMAIL"
  | "TOO_MANY_ATTEMPTS_TRY_LATER"
  | "USER_DISABLED"
  | "OPERATION_NOT_ALLOWED"
  | "API_KEY_INVALID"
  | "MISSING_CONFIG"
  | "NETWORK_ERROR"
  | "INVALID_INPUT"
  | "UNKNOWN";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    // Restore the prototype chain so `instanceof AuthError` works when this
    // project is transpiled down to ES2020/CommonJS.
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}