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
  return {
    firebase: {
      apiKey: env.FIREBASE_API_KEY ?? "",
      authDomain: env.FIREBASE_AUTH_DOMAIN ?? "",
      projectId: env.FIREBASE_PROJECT_ID ?? "",
      storageBucket: env.FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: env.FIREBASE_APP_ID ?? "",
    },
    authStub: (env.AUTH_STUB ?? "true").toLowerCase() !== "false",
    refreshIntervalMs: Number(env.REFRESH_INTERVAL ?? 1000) || 1000,
  };
}
