using DesignPatterns.Singleton;

Console.WriteLine("=== Singleton Pattern: Application configuration ===");
Console.WriteLine("Booting modules...");

// Neither module creates the configuration: both ask for the single shared instance.
var database = new DatabaseModule();
var api = new ApiModule();
database.Start();
api.Start();

Console.WriteLine($"same instance: {(ReferenceEquals(database.Config, api.Config) ? "true" : "false")}");

Console.WriteLine("Settings (read through the shared instance):");
foreach (var key in new[] { "appName", "environment", "maxConnections", "timeoutSeconds" })
{
    Console.WriteLine($"  {key,-16} = {AppConfig.Instance.Get(key)}");
}

// Thread safety: many tasks race for the instance. Results are collected first and
// printed afterwards, so the output stays deterministic.
const int workers = 8;
var seen = await Task.WhenAll(Enumerable.Range(0, workers).Select(_ => Task.Run(() => AppConfig.Instance)));

Console.WriteLine($"{workers} concurrent workers asked for the config...");
Console.WriteLine($"  distinct instances: {seen.Distinct().Count()}");
Console.WriteLine($"  times loaded: {AppConfig.LoadCount}");
