import type { AuthUser } from "../types";

/**
 * AuthService — abstraction over the authentication backend.
 *
 * The app depends only on this interface, so the real Firebase implementation
 * (FirebaseAuthService) can be swapped in later without touching the UI.
 */
export interface AuthService {
  /**
   * Validate credentials and return the authenticated user.
   * Throws AuthError with a user-friendly message on failure.
   */
  signIn(email: string, password: string): Promise<AuthUser>;
  /**
   * Register a new user and return it.
   * Throws AuthError with a user-friendly message on failure.
   */
  signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthUser>;
  /** Return the currently signed-in user, if any. */
  currentUser(): Promise<AuthUser | null>;
  /** Sign the current user out. */
  signOut(): Promise<void>;
}
