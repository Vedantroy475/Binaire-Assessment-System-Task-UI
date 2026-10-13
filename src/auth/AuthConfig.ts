/** Loads environment configuration (Firebase + runtime settings). */
export interface AppConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  /** When true, bypass auth using the StubAuthService (demo mode). */
  authStub: boolean;
  /** System polling interval in milliseconds. */
  refreshIntervalMs: number;
}

/** Build the app configuration from environment variables. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Normalize string: strip whitespace, carriage returns (\r), and enclosing quotes
  const rawStub = (env.AUTH_STUB ?? "true")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();

  const isStub = rawStub !== "false" && rawStub !== "0";

  return {
    firebase: {
      apiKey: (env.FIREBASE_API_KEY ?? "").trim().replace(/^["']|["']$/g, ""),
      authDomain: (env.FIREBASE_AUTH_DOMAIN ?? "").trim(),
      projectId: (env.FIREBASE_PROJECT_ID ?? "").trim(),
      storageBucket: (env.FIREBASE_STORAGE_BUCKET ?? "").trim(),
      messagingSenderId: (env.FIREBASE_MESSAGING_SENDER_ID ?? "").trim(),
      appId: (env.FIREBASE_APP_ID ?? "").trim(),
    },
    authStub: isStub,
    refreshIntervalMs: Number(env.REFRESH_INTERVAL ?? 1000) || 1000,
  };
}