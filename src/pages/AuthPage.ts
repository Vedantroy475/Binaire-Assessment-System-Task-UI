import type { AuthService } from "../auth/AuthService";
import { AuthError } from "../auth/AuthError";
import type { AuthUser } from "../types";
import { SessionStore } from "../offline/SessionStore";
import { SignUpScreen } from "../components/Auth/SignUpScreen";

declare const blessed: any;

/**
 * AuthPage — the authentication gate shown before the dashboard.
 * Renders the sign-up screen (which also toggles to sign-in) and coordinates
 * credential submission with the AuthService. On success it invokes onAuthed.
 */
export class AuthPage {
  private title: any;
  private screenComp: SignUpScreen;

  constructor(
    private screen: any,
    private readonly auth: AuthService,
    private readonly session: SessionStore,
    private readonly onAuthed: (user: AuthUser) => void,
  ) {
    this.title = blessed.box({
      parent: screen,
      top: 2,
      left: "center",
      width: "shrink",
      height: 3,
      tags: true,
      content:
        "{bold}{cyan-fg}Binaire Freznel Assessment{/cyan-fg}{/bold}\n{gray-fg}System Tasks & Sensor Viewer{/gray-fg}",
    });

    this.screenComp = new SignUpScreen(
      screen,
      auth,
      async (email, password, name, mode) => {
        try {
          // Route by mode: the toggle switches between registering a new
          // account (signUp) and signing into an existing one (signIn).
          const user =
            mode === "signin"
              ? await auth.signIn(email, password)
              : await auth.signUp(email, password, name || email.split("@")[0]);
          session.set(user);
          this.onAuthed(user);
        } catch (err) {
          // Present a specific, user-friendly message for known failures.
          const message =
            err instanceof AuthError
              ? err.message
              : "Something went wrong. Please try again.";
          this.screenComp.setError(message);
        }
      },
    );
    this.screenComp.focus();
    this.screen.render();
  }

  /** Tear down the auth UI when transitioning to the dashboard. */
  destroy(): void {
    this.screen.remove(this.title);
    this.title.destroy?.();
    this.screenComp.destroy();
  }
}
