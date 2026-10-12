import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/**
 * SignInScreen — a terminal form for signing into an existing account.
 * Standalone screen; on submit it returns the entered credentials to a
 * callback which delegates to the AuthService.
 */
export class SignInScreen {
  private form: any;
  private status: any;
  private inputs: any = {};
  private onSubmit: (email: string, password: string) => void;

  constructor(
    private screen: any,
    onSubmit: (email: string, password: string) => void,
  ) {
    this.onSubmit = onSubmit;

    this.form = blessed.form({
      parent: screen,
      keys: true,
      top: "center",
      left: "center",
      width: 52,
      height: 11,
      tags: true,
      border: { type: "line", fg: darkTheme.borderFg },
      label: " Sign in ",
      style: { border: { fg: darkTheme.borderFg } },
    });

    this.inputs.email = blessed.textbox({
      parent: this.form,
      name: "email",
      top: 1,
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
      top: 4,
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
      top: 7,
      left: 2,
      width: 12,
      height: 3,
      keys: true,
      mouse: true,
      shrink: true,
      style: { fg: "black", bg: "cyan", focus: { bg: "green" } },
      content: "Sign in",
    });
    submit.on("press", () => this.submit());

    this.status = blessed.text({
      parent: this.form,
      top: 10,
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
    this.inputs.email.focus();
    this.screen.render();
  }

  private async submit(): Promise<void> {
    const email = (this.inputs.email.getValue() ?? "").trim();
    const password = this.inputs.password.getValue() ?? "";
    if (!email || !password) {
      this.status.setContent(" {red-fg}Email and password are required{/red-fg}");
      this.screen.render();
      return;
    }
    this.status.setContent(" {yellow-fg}Working…{/yellow-fg}");
    this.screen.render();
    this.onSubmit(email, password);
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
