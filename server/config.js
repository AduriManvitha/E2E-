// Reads settings from environment variables only. Nothing secret is ever
// written in code. Locally they come from a git-ignored .env file; on Azure
// they are App Settings that point at Key Vault secrets.

export const REQUIRED_SETTINGS = ['DB_CONNECTION_STRING', 'JWT_SECRET'];
export const JWT_SECRET_MIN_LENGTH = 32;
export const DEFAULT_PORT = 3001;

export function loadConfig(env = process.env) {
  const missing = REQUIRED_SETTINGS.filter((name) => !env[name]);
  if (missing.length > 0) {
    // Only the *names* are reported, never values.
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. See .env.example.`,
    );
  }
  if (env.JWT_SECRET.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters long.`);
  }
  return {
    dbConnectionString: env.DB_CONNECTION_STRING,
    jwtSecret: env.JWT_SECRET,
    port: Number(env.PORT) || DEFAULT_PORT,
  };
}
