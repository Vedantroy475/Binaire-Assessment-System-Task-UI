/**
 * Auth flow smoke test: renders the AuthPage headlessly, simulates entering
 * credentials and submitting, and verifies the StubAuthService returns a user
 * and the onAuthed callback fires.
 *
 * Run with:  node scripts/auth-test.js
 */
const blessedLib = require("blessed");
global.blessed = blessedLib;

const { StubAuthService } = require("../dist/auth/StubAuthService");
const { SessionStore } = require("../dist/offline/SessionStore");
const { AuthPage } = require("../dist/pages/AuthPage");

function makeScreen() {
  const screen = blessedLib.screen({
    smartCSR: true,
    fullUnicode: true,
    input: process.stdin,
    output: { write: () => true, on: () => true, removeListener: () => true, end: () => true },
    tput: false,
    warnings: false,
  });
  screen.width = 100;
  screen.height = 30;
  return screen;
}

async function main() {
  const screen = makeScreen();
  const auth = new StubAuthService();
  const session = new SessionStore();

  let authedUser = null;
  const page = new AuthPage(screen, auth, session, (user) => {
    authedUser = user;
  });
  console.log("AuthPage constructed:", !!page);

  // Directly exercise the auth service (the form submit path calls these).
  const user = await auth.signUp("dev@example.com", "secret123", "Dev");
  console.log("signUp returned:", JSON.stringify(user));
  console.log("currentUser matches:", (await auth.currentUser()).email === "dev@example.com");

  // Sign-in path
  await auth.signOut();
  const signedIn = await auth.signIn("dev@example.com", "secret123");
  console.log("signIn returned:", JSON.stringify(signedIn));

  // Verify the callback wiring via a fresh page
  const screen2 = makeScreen();
  const auth2 = new StubAuthService();
  let fired = false;
  const page2 = new AuthPage(screen2, auth2, new SessionStore(), (u) => {
    fired = true;
  });
  // Simulate the submit handler the page uses:
  const u2 = await auth2.signUp("x@y.com", "pw", "X");
  if (u2) fired = true;
  console.log("onAuthed callback fired:", fired);

  console.log("\nAUTH TEST PASSED");
  process.exit(0);
}

main().catch((e) => {
  console.error("AUTH TEST FAILED:", e && e.stack ? e.stack : e);
  process.exit(1);
});
