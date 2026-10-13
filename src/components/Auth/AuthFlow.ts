import type { AuthService } from "../../auth/AuthService";
import { darkTheme } from "../../styles/theme";

declare const blessed: any;

/** Field kinds a step can ask for. */
type FieldKind = "name" | "email" | "password";

/**
 * AuthFlow — a step-by-step terminal authentication wizard.
 *
 * Instead of showing every field at once (which made the terminal cursor
 * ambiguous), this renders ONE focused task per screen:
 *
 *   Step 0 — choose mode:   [ Sign in ]  [ Sign up ]   (← → to switch, Enter)
 *   then, per mode, one field per screen:
 *     sign in  → email → password
 *     sign up  → name  → email → password
 *
 * Because each step exposes at most ONE free-text input, there is never any
 * doubt about where the terminal cursor points — it can only be on that one
 * field. `inputOnFocus: false` + a guarded readInput avoids the blessed
 * `rewindFocus` focus-fight that previously froze the cursor. Navigation
 * between the input and the Continue/Back buttons uses Tab / Shift+Tab / Up /
 * Down, registered on each element so it works even while an input is being
 * edited (blessed sets screen.grabKeys=true then, so screen-level keys don't
 * fire). Left / Right are reserved for moving the text cursor inside a field.
 *
 * The public surface (constructor, focus, setError, destroy, element) matches
 * what AuthPage already expects, so the page wiring and AuthService contract
 * are unchanged.
 */
export class AuthFlow {
  private frame: any;

  // Step 0 — mode selection.
  private modeBox: any;
  private signInBtn: any;
  private signUpBtn: any;

  // Per-field UI: each is built once, shown/hidden by step.
  private fieldBoxes: Record<FieldKind, any> = {} as any;
  private fieldInputs: Record<FieldKind, any> = {} as any;
  private fieldErrors: Record<FieldKind, any> = {} as any;
  private fieldNav: Record<FieldKind, any> = {} as any;

  /** 0 = mode, 1..n = field sequence (see buildSequence). */
  private step = 0;
  private mode: "signin" | "signup" = "signin";
  private values: Record<FieldKind, string> = {
    name: "",
    email: "",
    password: "",
  };

  private static readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private screen: any,
    private readonly auth: AuthService,
    private readonly onSubmit: (
      email: string,
      password: string,
      name: string,
      mode: "signup" | "signin",
    ) => void,
  ) {
    this.buildFrame();
    this.buildModeStep();
    this.buildFieldStep("email");
    this.buildFieldStep("password");
    this.buildFieldStep("name");
    this.setStep(0);
    this.screen.render();
  }

  /** Root bordered card; its label reflects the chosen mode. */
  private buildFrame(): void {
    this.frame = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: 50,
      height: 15,
      keys: true,
      tags: true,
      border: { type: "line", fg: darkTheme.borderFg },
      label: " Sign in ",
      style: { border: { fg: darkTheme.borderFg } },
    });
  }

  /** Step 0 — two buttons on one row; arrows/Tab switch, Enter selects. */
  private buildModeStep(): void {
    this.modeBox = blessed.box({
      parent: this.frame,
      top: 0,
      left: 0,
      right: 0,
      height: this.frame.height,
      tags: true,
    });

    blessed.text({
      parent: this.modeBox,
      top: 1,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content:
        "{bold}{white-fg}How would you like to continue?{/white-fg}{/bold}",
    });

    this.signInBtn = blessed.button({
      parent: this.modeBox,
      name: "signin",
      top: 4,
      left: 6,
      width: 16,
      height: 3,
      keys: true,
      mouse: true,
      shrink: true,
      content: "Sign in",
    });
    this.signInBtn.on("press", () => this.selectMode("signin"));

    this.signUpBtn = blessed.button({
      parent: this.modeBox,
      name: "signup",
      top: 4,
      left: 26,
      width: 16,
      height: 3,
      keys: true,
      mouse: true,
      shrink: true,
      content: "Sign up",
    });
    this.signUpBtn.on("press", () => this.selectMode("signup"));

    // Navigation between the two mode buttons. Blessed buttons only handle
    // Enter/Space natively and deliver `key <name>` events to the FOCUSED
    // element, so we bind these on each button: arrows, Tab and Shift+Tab all
    // switch focus (and the selected mode). Enter is left to the button's own
    // press handling, which follows whichever button is focused.
    for (const btn of [this.signInBtn, this.signUpBtn]) {
      btn.on("key right", () => this.focusMode("signup"));
      btn.on("key down", () => this.focusMode("signup"));
      btn.on("key tab", () => this.focusMode("signup"));
      btn.on("key left", () => this.focusMode("signin"));
      btn.on("key up", () => this.focusMode("signin"));
      btn.on("key S-tab", () => this.focusMode("signin"));
    }

    blessed.text({
      parent: this.modeBox,
      top: 9,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content: "{gray-fg}← → / Tab to switch · Enter to select{/gray-fg}",
    });
  }

  /**
   * Move focus (and selection) to the given mode button. Registered handlers
   * call this on arrows/Tab; setStep(0) also uses it for the initial focus.
   */
  private focusMode(mode: "signin" | "signup"): void {
    this.mode = mode;
    this.renderMode();
    (mode === "signin" ? this.signInBtn : this.signUpBtn).focus();
    this.screen.render();
  }

  /**
   * Build a single-field step (name / email / password). The input carries a
   * border so its `label` renders on the border line — this removes the old
   * overlap where a heading text and the field's label fought for the same row.
   */
  private buildFieldStep(kind: FieldKind): void {
    const meta: Record<FieldKind, { label: string; next: string }> = {
      name: { label: " Full name ", next: "Continue" },
      email: { label: " Email ", next: "Continue" },
      password: { label: " Password ", next: "Enter" },
    };
    const isPassword = kind === "password";

    const box = blessed.box({
      parent: this.frame,
      top: 0,
      left: 0,
      right: 0,
      height: this.frame.height,
      tags: true,
      hidden: true,
    });

    const input = blessed.textbox({
      parent: box,
      name: kind,
      top: 3,
      left: 2,
      right: 2,
      height: 3,
      label: meta[kind].label,
      inputOnFocus: false,
      censor: isPassword,
      keys: true,
      border: { type: "line" },
      style: {
        fg: darkTheme.text,
        border: { fg: darkTheme.dim },
        focus: { fg: darkTheme.text, border: { fg: darkTheme.accent } },
      },
    });

    const error = blessed.text({
      parent: box,
      top: 6,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      style: { fg: "red" },
      content: "",
    });

    const nextBtn = blessed.button({
      parent: box,
      name: "next",
      top: 8,
      left: 2,
      width: 12,
      height: 3,
      keys: true,
      mouse: true,
      shrink: true,
      style: { fg: "black", bg: darkTheme.accent, focus: { bg: "green" } },
      content: meta[kind].next,
    });
    nextBtn.on("press", () => this.submitField(kind));

    const backBtn = blessed.button({
      parent: box,
      name: "back",
      top: 8,
      left: 17,
      width: 12,
      height: 3,
      keys: true,
      mouse: true,
      shrink: true,
      style: { fg: "white", bg: "gray", focus: { bg: darkTheme.selectedBg } },
      content: "← Back",
    });
    backBtn.on("press", () => this.goBack());

    this.wireInput(input, kind);
    this.registerNav([input, nextBtn, backBtn]);
    input.key("escape", () => this.goBack());
    backBtn.key("escape", () => this.goBack());

    this.fieldBoxes[kind] = box;
    this.fieldInputs[kind] = input;
    this.fieldErrors[kind] = error;
    this.fieldNav[kind] = { nextBtn, backBtn };
  }

  /**
   * Cursor + input wiring. We drive readInput ourselves (rather than
   * inputOnFocus) so focus changes stick and the cursor parks on this field.
   * Guarded to be idempotent: a duplicate focus event on a field already
   * reading must not restart input.
   */
  private wireInput(el: any, kind: FieldKind): void {
    el.key("enter", () => this.submitField(kind));
    el.on("focus", () => {
      if (this.screen.focused === el && el._reading) return;
      this.screen.render();
      if (el._reading) return;
      if (this.screen.focused !== el) return;
      el.readInput(null);
    });
    el.on("blur", () => {
      this.screen.program.hideCursor();
    });
  }

  /**
   * Cycle focus among a step's controls with Tab / Shift+Tab / Down / Up.
   *
   * IMPORTANT: we bind with element-level `on("key ...")` listeners rather than
   * `element.key(...)`. Blessed emits `key <name>` on the FOCUSED element, so
   * these fire only for whichever control currently has focus and keep working
   * while an input holds grabKeys (a screen/`element.key` binding would not).
   * The handler always moves focus relative to the CURRENTLY focused control
   * (looked up in the ring), so it doesn't matter which element emitted it.
   * Left / Right are intentionally NOT handled so they move the text caret.
   */
  private registerNav(ring: any[]): void {
    const move = (dir: 1 | -1) => {
      const cur = this.screen.focused;
      let idx = ring.indexOf(cur);
      idx = idx === -1 ? 0 : (idx + dir + ring.length) % ring.length;
      const target = ring[idx];
      if (this.screen.focused === target) return;
      this.screen.render();
      target.focus();
      this.screen.render();
    };
    for (const el of ring) {
      el.on("key tab", () => move(1));
      el.on("key down", () => move(1));
      el.on("key S-tab", () => move(-1));
      el.on("key up", () => move(-1));
    }
  }

  /** Focus an input after the layout is valid (render, then focus). */
  private focusInput(el: any): void {
    this.screen.render();
    el.focus();
    this.screen.render();
  }

  // --- Sequence + transitions --------------------------------------------

  private buildSequence(): FieldKind[] {
    return this.mode === "signup"
      ? ["name", "email", "password"]
      : ["email", "password"];
  }

  /** Advance to the next step, or submit when the sequence is finished. */
  private advance(): void {
    const seq = this.buildSequence();
    if (this.step >= seq.length) this.submitFinal();
    else this.setStep(this.step + 1);
  }

  /** Move focus to the given ring target (buttons/inputs), re-rendering. */
  private focusTarget(target: any): void {
    if (this.screen.focused === target) return;
    this.screen.render();
    target.focus();
    this.screen.render();
  }

  private setStep(step: number): void {
    this.step = step;
    const seq = this.buildSequence();

    if (step === 0) {
      // Hide every field box (not just the current sequence's) so nothing
      // leaks through when switching modes, hide the hardware cursor (the
      // mode step has no text input), and focus the selected mode button.
      (["name", "email", "password"] as FieldKind[]).forEach((k) => {
        this.fieldBoxes[k].hidden = true;
      });
      this.screen.program.hideCursor();
      this.focusMode(this.mode);
      return;
    }

    // Hide all field boxes, then show only the current one.
    for (const kind of seq) this.fieldBoxes[kind].hidden = true;
    this.modeBox.hidden = true;
    const kind = seq[step - 1];
    this.fieldBoxes[kind].hidden = false;
    this.fieldErrors[kind].setContent("");
    this.focusInput(this.fieldInputs[kind]);
  }

  private goBack(): void {
    if (this.step === 0) return;
    this.setStep(this.step - 1);
  }

  private selectMode(mode: "signin" | "signup"): void {
    this.mode = mode;
    this.frame.setLabel(mode === "signup" ? " Sign up " : " Sign in ");
    this.setStep(1);
  }

  /** Paint selection state for both buttons. */
  private renderMode(): void {
    const chosen = this.mode === "signin" ? this.signInBtn : this.signUpBtn;
    const other = this.mode === "signin" ? this.signUpBtn : this.signInBtn;
    chosen.style = {
      fg: "black",
      bg: darkTheme.accent,
      focus: { fg: "black", bg: "green" },
    };
    other.style = {
      fg: "white",
      bg: "black",
      focus: { fg: "black", bg: darkTheme.selectedBg },
    };
    this.modeBox.hidden = false;
  }

  // --- Submit -------------------------------------------------------------

  /** Validate + persist the current field, then advance or submit. */
  private submitField(kind: FieldKind): void {
    const value = this.fieldInputs[kind].getValue() ?? "";
    const trimmed = kind === "password" ? value : value.trim();

    if (kind === "email" && !AuthFlow.EMAIL_RE.test(trimmed)) {
      this.fieldErrors[kind].setContent(
        " {red-fg}Please enter a valid email address.{/red-fg}",
      );
      this.screen.render();
      return;
    }
    if (trimmed === "") {
      const what = kind === "name" ? "Full name" : "Password";
      this.fieldErrors[kind].setContent(
        ` {red-fg}${what} cannot be empty.{/red-fg}`,
      );
      this.screen.render();
      return;
    }

    this.values[kind] = trimmed;
    this.fieldErrors[kind].setContent("");
    this.advance();
  }

  private submitFinal(): void {
    this.fieldErrors.password.setContent(" {yellow-fg}Verifying…{/yellow-fg}");
    this.screen.render();
    // AuthPage routes by mode and handles success/failure. On failure it calls
    // setError() so the message appears on the password step.
    this.onSubmit(
      this.values.email,
      this.values.password,
      this.values.name,
      this.mode,
    );
  }

  // --- Public surface (matches the previous screen component) -------------

  get element(): any {
    return this.frame;
  }

  /** Initial focus: land on the mode step. */
  focus(): void {
    this.setStep(0);
  }

/** Show an error on whichever field step is currently active and re-arm typing. */
  setError(message: string): void {
    const seq = this.buildSequence();
    const kind = seq[this.step - 1];
    if (kind && this.fieldErrors[kind]) {
      this.fieldErrors[kind].setContent(` {red-fg}${message}{/red-fg}`);
      
      const input = this.fieldInputs[kind];
      if (input) {
        // Clear previous erroneous password and restart cursor capture
        if (kind === "password") {
          input.setValue("");
        }
        if (!input._reading) {
          input.readInput(null);
        }
      }
      this.screen.render();
    }
  }

  destroy(): void {
    this.screen.remove(this.frame);
    this.frame.destroy?.();
  }
}
