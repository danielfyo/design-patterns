// Run with: npx tsx patterns/creational/singleton/typescript/main.ts
import { ApiModule, AppConfig, DatabaseModule } from "./config.ts";

console.log("=== Singleton Pattern: Application configuration ===");
console.log("Booting modules...");

// Neither module creates the configuration: both ask for the single shared instance.
const database = new DatabaseModule();
const api = new ApiModule();
console.log(database.start());
console.log(api.start());

console.log(`same instance: ${database.config === api.config}`);

console.log("Settings (read through the shared instance):");
for (const key of ["appName", "environment", "maxConnections", "timeoutSeconds"]) {
  console.log(`  ${key.padEnd(16)} = ${AppConfig.instance.get(key)}`);
}

// "Concurrency" in JS means interleaved async tasks on one thread; they all get the same object.
const workers = 8;
const seen = await Promise.all(
  Array.from({ length: workers }, async () => {
    await Promise.resolve(); // yield, like a real async worker would
    return AppConfig.instance;
  }),
);

console.log(`${workers} concurrent workers asked for the config...`);
console.log(`  distinct instances: ${new Set(seen).size}`);
console.log(`  times loaded: ${AppConfig.loadCount}`);
