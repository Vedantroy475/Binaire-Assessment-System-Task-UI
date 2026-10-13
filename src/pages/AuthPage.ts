import type { AuthService } from "../auth/AuthService";
import { AuthError } from "../auth/AuthError";
import type { AuthUser } from "../types";
import { SessionStore } from "../offline/SessionStore";
import { AuthFlow } from "../components/Auth/AuthFlow";
import { StubAuthService } from "../auth/StubAuthService";

declare const blessed: any;

export class AuthPage {
  private title: any;
  private screenComp: AuthFlow;

  constructor(
    private screen: any,
    private readonly auth: AuthService,
    private readonly session: SessionStore,
    private readonly onAuthed: (user: AuthUser) => void,
  ) {
    const isStub = auth instanceof StubAuthService;
    const modeBadge = isStub
      ? "{yellow-fg}[DEMO STUB MODE - Firebase Disabled]{/yellow-fg}"
      : "{green-fg}[FIREBASE ACTIVE]{/green-fg}";

    this.title = blessed.box({
      parent: screen,
      top: 1,
      left: "center",
      width: "shrink",
      height: 4,
      tags: true,
      content:
        `{bold}{cyan-fg}Binaire Freznel Assessment{/cyan-fg}{/bold}\n` +
        `{gray-fg}System Tasks & Sensor Viewer{/gray-fg}\n` +
        `${modeBadge}`,
    });

    this.screenComp = new AuthFlow(
      screen,
      auth,
      async (email, password, name, mode) => {
        try {
          const user =
            mode === "signin"
              ? await auth.signIn(email, password)
              : await auth.signUp(email, password, name || email.split("@")[0]);
          session.set(user);
          this.onAuthed(user);
        } catch (err) {
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

  destroy(): void {
    this.screen.remove(this.title);
    this.title.destroy?.();
    this.screenComp.destroy();
  }
}