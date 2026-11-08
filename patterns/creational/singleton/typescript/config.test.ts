import { describe, expect, it, vi } from "vitest";
import { ApiModule, AppConfig, DatabaseModule } from "./config.ts";

// Vitest evaluates every test file in its own module graph, so this file starts with a
// fresh, not yet loaded configuration.
describe("Singleton: application configuration", () => {
  it("loads the configuration lazily, once, on first access", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(AppConfig.loadCount).toBe(0);

    for (let i = 0; i < 10; i++) AppConfig.instance.get("appName");

    expect(AppConfig.loadCount).toBe(1);
    expect(log).toHaveBeenCalledExactlyOnceWith("[config] loading configuration...");
  });

  it("always returns the same object", () => {
    expect(AppConfig.instance).toBe(AppConfig.instance);
  });

  it("gives interleaved async workers the same instance", async () => {
    const seen = await Promise.all(
      Array.from({ length: 16 }, async () => {
        await Promise.resolve();
        return AppConfig.instance;
      }),
    );

    expect(new Set(seen).size).toBe(1);
    expect(AppConfig.loadCount).toBe(1);
  });

  it("does not let clients call the constructor", () => {
    // Never invoked: the point is that the compiler rejects the expression.
    const attempt = () =>
      // @ts-expect-error the constructor is private
      new AppConfig();

    expect(typeof attempt).toBe("function");
  });

  it.each([
    ["appName", "Shop API"],
    ["environment", "production"],
    ["maxConnections", "20"],
    ["timeoutSeconds", "30"],
  ])("returns the %s setting", (key, expected) => {
    expect(AppConfig.instance.get(key)).toBe(expected);
  });

  it("rejects an unknown setting", () => {
    expect(() => AppConfig.instance.get("missing")).toThrow("Unknown setting 'missing'");
  });

  it("lists the available keys", () => {
    expect(AppConfig.instance.keys()).toEqual(["appName", "environment", "maxConnections", "timeoutSeconds"]);
  });

  it("shares the instance between unrelated modules", () => {
    const database = new DatabaseModule();
    const api = new ApiModule();

    expect(database.config).toBe(api.config);
    expect(database.config).toBe(AppConfig.instance);
    expect(database.start()).toBe("DatabaseModule: opening pool with maxConnections=20 (production)");
    expect(api.start()).toBe('ApiModule: serving "Shop API" with timeoutSeconds=30');
  });
});
