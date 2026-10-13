import type { AuthService } from "../../auth/AuthService";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * SignUpScreen — a terminal form for creating an account.
 * Renders fields for name/email/password and submits to the AuthService.
 */
export class SignUpScreen {
  private form: any;
  private status: any;
  private inputs: any = {};
  private mode: "signup" | "signin" = "signup";
  private onSubmit: (
    email: string,
    password: string,
    name: string,
    mode: "signup" | "signin",
  ) => void;

  constructor(
    private screen: any,
    private readonly auth: AuthService,
    onSubmit: (
      email: string,
      password: string,
      name: string,
      mode: "signup" | "signin",
    ) => void,
  ) {
    this.onSubmit = onSubmit;

    this.form = blessed.form({
      parent: screen,
      keys: true,
      top: "center",
      left: "center",
      width: 52,
      height: 14,
      tags: true,
      border: { type: "line", fg: darkTheme.borderFg },
      label: " Sign up ",
      style: { border: { fg: darkTheme.borderFg } },
    });

    this.inputs.name = blessed.textbox({
      parent: this.form,
      name: "name",
      top: 1,
      left: 2,
      right: 2,
      height: 1,
      label: " Full name ",
      inputOnFocus: true,
      keys: true,
      style: { fg: darkTheme.text, border: { fg: darkTheme.dim } },
    });
    this.inputs.email = blessed.textbox({
      parent: this.form,
      name: "email",
      top: 4,
      left: 2,
      right: 2,
      height: 1,
      label: " Email ",
      inputOnFocus: true,
      keys: true,
      style: { fg: darkTheme.text, border: { fg: darkTheme.dim } },
    });
    this.inputs.password = blessed.textbox({
      parent: this.form,
      name: "password",
      top: 7,
      left: 2,
      right: 2,
      height: 1,
      label: " Password ",
      inputOnFocus: true,
      censor: true,
      keys: true,
      style: { fg: darkTheme.text, border: { fg: darkTheme.dim } },
    });

    const submit = blessed.button({
      parent: this.form,
      name: "submit",
      top: 10,
      left: 2,
      width: 12,
      height: 3,
      keys: true,
      mouse: true,
      shrink: true,
      style: { fg: "black", bg: "cyan", focus: { bg: "green" } },
      content: "Sign up",
    });
    submit.on("press", () => this.submit());

    const toggle = blessed.button({
      parent: this.form,
      name: "toggle",
      top: 10,
      left: 18,
      width: 20,
      height: 3,
      keys: true,
      mouse: true,
      shrink: true,
      style: { fg: "white", bg: "gray", focus: { bg: "blue" } },
      content: "Have an account? Sign in",
    });
    toggle.on("press", () => this.toggleMode());

    this.status = blessed.text({
      parent: this.form,
      top: 13,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      style: { fg: "red" },
      content: "",
    });

    this.form.key("enter", () => this.submit());
  }

  get element(): any {
    return this.form;
  }

  focus(): void {
    this.inputs.name.focus();
    this.screen.render();
  }

  /** Switch between sign-up and sign-in variants of the same form. */
  toggleMode(): void {
    this.mode = this.mode === "signup" ? "signin" : "signup";
    const signup = this.mode === "signup";
    this.form.setLabel(signup ? " Sign up " : " Sign in ");
    this.inputs.name.hidden = !signup;
    this.inputs.name[signup ? "show" : "hide"]();
    (signup ? this.form.children[0] : this.inputs.email).focus?.();
    if (signup) this.inputs.name.focus();
    else this.inputs.email.focus();
    this.screen.render();
  }

  private async submit(): Promise<void> {
    const email = (this.inputs.email.getValue() ?? "").trim();
    const password = this.inputs.password.getValue() ?? "";
    const name = (this.inputs.name.getValue() ?? "").trim();
    if (!email || !password) {
      this.status.setContent(" {red-fg}Email and password are required{/red-fg}");
      this.screen.render();
      return;
    }
    this.status.setContent(" {yellow-fg}Working…{/yellow-fg}");
    this.screen.render();
    this.onSubmit(email, password, name, this.mode);
  }

  setError(message: string): void {
    this.status.setContent(` {red-fg}${message}{/red-fg}`);
    this.screen.render();
  }

  destroy(): void {
    this.screen.remove(this.form);
    this.form.destroy?.();
  }
}
