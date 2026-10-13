/**
 * FirebaseAuthService tests using a mocked global.fetch.
 *
 * No network calls and no real credentials are used. Validates:
 *   - successful sign-up / sign-in response mapping to AuthUser
 *   - Firebase error codes mapped to user-friendly AuthErrors
 *   - network failure -> AuthError(NETWORK_ERROR)
 *   - missing configuration -> constructor throws AuthError(MISSING_CONFIG)
 *   - safe logging: passwords, idToken, refreshToken and the API key are
 *     never written to the console, and no token is retained on the session.
 *
 * Run with:  node scripts/auth-firebase-test.js   (after `npm run build`)
 */
const { FirebaseAuthService } = require("../dist/auth/FirebaseAuthService");
const { AuthError } = require("../dist/auth/AuthError");

const API_KEY = "TEST_API_KEY_abc123";
const PASSWORD = "SuperSecretPw1!";

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed++;
    console.log("  PASS - " + label);
  } else {
    failed++;
    console.error("  FAIL - " + label);
  }
}

async function expectAuthError(fn, code, label) {
  try {
    await fn();
    failed++;
    console.error("  FAIL - " + label + " (expected AuthError, none thrown)");
  } catch (e) {
    if (!(e instanceof AuthError)) {
      failed++;
      console.error("  FAIL - " + label + " (not an AuthError: " + e.name + ")");
      return;
    }
    assert(e.code === code, label + " (code=" + e.code + ")");
  }
}

/** Minimal Response-like object backed by fetch mocking. */
function jsonResponse(ok, body, status) {
  return {
    ok: ok,
    status: status || (ok ? 200 : 400),
    async json() {
      return body;
    },
  };
}

const realFetch = global.fetch;
function setFetch(handler) {
  global.fetch = handler;
}
function restoreFetch() {
  global.fetch = realFetch;
}

async function main() {
  console.log("=== FirebaseAuthService mocked tests ===");

  // 1) Successful sign-up maps the response to AuthUser.
  {
    const svc = new FirebaseAuthService({ apiKey: API_KEY });
    setFetch(async () =>
      jsonResponse(true, {
        localId: "uid_abc",
        email: "new@example.com",
        idToken: "SECRET_ID_TOKEN",
        refreshToken: "SECRET_REFRESH",
        expiresIn: "3600",
      }),
    );
    const user = await svc.signUp("new@example.com", PASSWORD, "New User");
    assert(user.uid === "uid_abc", "signUp maps localId -> uid");
    assert(user.email === "new@example.com", "signUp maps email");
    assert(user.displayName === "New User", "signUp keeps provided displayName");
    assert((await svc.currentUser()).uid === "uid_abc", "signUp sets currentUser");
    restoreFetch();
  }

  // 2) Successful sign-in maps the response; displayName derived from email.
  {
    const svc = new FirebaseAuthService({ apiKey: API_KEY });
    setFetch(async () =>
      jsonResponse(true, {
        localId: "uid_xyz",
        email: "ret@example.com",
        idToken: "SECRET_ID_TOKEN",
        refreshToken: "SECRET_REFRESH",
        expiresIn: "3600",
      }),
    );
    const user = await svc.signIn("ret@example.com", PASSWORD);
    assert(user.uid === "uid_xyz", "signIn maps localId -> uid");
    assert(user.displayName === "ret", "signIn derives displayName from email");
    assert((await svc.currentUser()).email === "ret@example.com", "signIn sets currentUser");
    restoreFetch();
  }

  // 3) Firebase error codes -> friendly AuthErrors.
  const errorCases = [
    ["EMAIL_EXISTS", "EMAIL_EXISTS"],
    ["WEAK_PASSWORD", "WEAK_PASSWORD"],
    ["INVALID_LOGIN_CREDENTIALS", "INVALID_LOGIN_CREDENTIALS"],
    ["EMAIL_NOT_FOUND", "EMAIL_NOT_FOUND"],
  ];
  for (const [raw, code] of errorCases) {
    const svc = new FirebaseAuthService({ apiKey: API_KEY });
    setFetch(async () => jsonResponse(false, { error: { message: raw } }, 400));
    await expectAuthError(() => svc.signIn("a@b.com", "pw"), code, "maps " + raw);
    restoreFetch();
  }

  // 4) Network failure -> AuthError(NETWORK_ERROR).
  {
    const svc = new FirebaseAuthService({ apiKey: API_KEY });
    setFetch(async () => {
      throw new TypeError("fetch failed");
    });
    await expectAuthError(() => svc.signIn("a@b.com", "pw"), "NETWORK_ERROR", "network failure");
    restoreFetch();
  }

  // 5) Missing configuration -> constructor throws AuthError(MISSING_CONFIG).
  {
    let threw = null;
    try {
      // eslint-disable-next-line no-new
      new FirebaseAuthService({ apiKey: "" });
    } catch (e) {
      threw = e;
    }
    assert(
      threw instanceof AuthError && threw.code === "MISSING_CONFIG",
      "empty apiKey -> MISSING_CONFIG on construction",
    );
  }

  // 6) Safe logging + no in-memory token retention.
  {
    const svc = new FirebaseAuthService({ apiKey: API_KEY });
    const captured = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...a) => captured.push(a.join(" "));
    console.error = (...a) => captured.push(a.join(" "));

    setFetch(async () =>
      jsonResponse(true, {
        localId: "uid_s",
        email: "s@example.com",
        idToken: "SECRET_ID_TOKEN",
        refreshToken: "SECRET_REFRESH",
        expiresIn: "3600",
      }),
    );
    await svc.signIn("s@example.com", PASSWORD);

    setFetch(async () => jsonResponse(false, { error: { message: "WEAK_PASSWORD" } }, 400));
    try {
      await svc.signUp("s@example.com", PASSWORD, "S");
    } catch {
      /* expected */
    }

    console.log = origLog;
    console.error = origErr;
    restoreFetch();

    const blob = captured.join("\n");
    assert(!blob.includes("SECRET_ID_TOKEN"), "idToken never logged");
    assert(!blob.includes("SECRET_REFRESH"), "refreshToken never logged");
    assert(!blob.includes(PASSWORD), "password never logged");
    assert(!blob.includes(API_KEY), "API key never logged");

    const u = await svc.currentUser();
    const keys = u ? Object.keys(u).sort().join(",") : "";
    assert(keys === "displayName,email,uid", "currentUser holds no token fields (keys=" + keys + ")");
  }

  console.log("\nFIREBASE AUTH TESTS: " + passed + " passed, " + failed + " failed");
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FIREBASE AUTH TEST SUITE ERROR:", e && e.stack ? e.stack : e);
  process.exit(1);
});

