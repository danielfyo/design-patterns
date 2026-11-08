namespace DesignPatterns.Singleton;

/// <summary>
/// The Singleton: application-wide configuration that is loaded exactly once.
/// The constructor is private, so the only way to get an instance is <see cref="Instance"/>.
/// </summary>
public sealed class AppConfig
{
    // Lazy<T> defaults to LazyThreadSafetyMode.ExecutionAndPublication: even if many threads
    // ask at the same time, the factory runs once and everybody receives the same object.
    // It is the idiomatic replacement for hand-written double-checked locking.
    private static readonly Lazy<AppConfig> _instance = new(() => new AppConfig());

    private static int _loadCount;

    private readonly IReadOnlyDictionary<string, string> _settings;

    private AppConfig()
    {
        Interlocked.Increment(ref _loadCount);
        // Simulated expensive I/O (reading files, environment variables, a vault...).
        Console.WriteLine("[config] loading configuration...");
        _settings = new Dictionary<string, string>
        {
            ["appName"] = "Shop API",
            ["environment"] = "production",
            ["maxConnections"] = "20",
            ["timeoutSeconds"] = "30",
        };
    }

    /// <summary>The global access point. The instance is created on first access.</summary>
    public static AppConfig Instance => _instance.Value;

    /// <summary>How many times the configuration was loaded (should always be 1).</summary>
    public static int LoadCount => Volatile.Read(ref _loadCount);

    public string Get(string key) =>
        _settings.TryGetValue(key, out var value)
            ? value
            : throw new KeyNotFoundException($"Unknown setting '{key}'");
}

/// <summary>Client: a module that reads the shared configuration.</summary>
public sealed class DatabaseModule
{
    public AppConfig Config { get; } = AppConfig.Instance;

    public void Start() =>
        Console.WriteLine(
            $"DatabaseModule: opening pool with maxConnections={Config.Get("maxConnections")} ({Config.Get("environment")})");
}

/// <summary>Client: another, unrelated module that reads the same configuration.</summary>
public sealed class ApiModule
{
    public AppConfig Config { get; } = AppConfig.Instance;

    public void Start() =>
        Console.WriteLine(
            $"ApiModule: serving \"{Config.Get("appName")}\" with timeoutSeconds={Config.Get("timeoutSeconds")}");
}
