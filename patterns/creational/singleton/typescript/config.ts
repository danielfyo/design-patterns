/**
 * Singleton pattern: application configuration loaded exactly once.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (SingletonDemo.tsx).
 *
 * In TypeScript/JavaScript an ES module is evaluated only once per program, so a
 * module-scoped variable is already a singleton. The class keeps its constructor
 * private to make the "one instance only" rule explicit and enforced by the compiler.
 */

/** The Singleton: one shared, read-only configuration object. */
export class AppConfig {
  // Module-scoped (static) storage for the one instance.
  static #instance: AppConfig | undefined;
  static #loadCount = 0;

  readonly #settings: ReadonlyMap<string, string>;

  private constructor() {
    AppConfig.#loadCount++;
    // Simulated expensive I/O (reading files, environment variables, a vault...).
    console.log("[config] loading configuration...");
    this.#settings = new Map([
      ["appName", "Shop API"],
      ["environment", "production"],
      ["maxConnections", "20"],
      ["timeoutSeconds", "30"],
    ]);
  }

  /**
   * The global access point. JavaScript runs on a single thread, so a plain lazy
   * check is enough: no two callers can interleave inside this method.
   */
  static get instance(): AppConfig {
    AppConfig.#instance ??= new AppConfig();
    return AppConfig.#instance;
  }

  /** How many times the configuration was loaded (should always be 1). */
  static get loadCount(): number {
    return AppConfig.#loadCount;
  }

  get(key: string): string {
    const value = this.#settings.get(key);
    if (value === undefined) throw new Error(`Unknown setting '${key}'`);
    return value;
  }

  keys(): string[] {
    return [...this.#settings.keys()];
  }
}

/** Client: a module that reads the shared configuration. */
export class DatabaseModule {
  readonly config = AppConfig.instance;

  start(): string {
    return `DatabaseModule: opening pool with maxConnections=${this.config.get("maxConnections")} (${this.config.get("environment")})`;
  }
}

/** Client: another, unrelated module that reads the same configuration. */
export class ApiModule {
  readonly config = AppConfig.instance;

  start(): string {
    return `ApiModule: serving "${this.config.get("appName")}" with timeoutSeconds=${this.config.get("timeoutSeconds")}`;
  }
}
