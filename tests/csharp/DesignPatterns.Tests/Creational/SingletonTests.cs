using System.Reflection;
using DesignPatterns.Singleton;

namespace DesignPatterns.Tests.Creational;

// The first access to AppConfig.Instance prints a line, so these tests run in the sequential
// "Console" collection to keep that line out of other classes' captured output.
[Collection("Console")]
public sealed class SingletonTests
{
    [Fact]
    public void Instance_always_returns_the_same_object()
    {
        var first = AppConfig.Instance;
        var second = AppConfig.Instance;

        Assert.Same(first, second);
    }

    [Fact]
    public void Constructor_is_private_so_clients_cannot_create_another_instance()
    {
        var publicConstructors = typeof(AppConfig).GetConstructors(BindingFlags.Public | BindingFlags.Instance);

        Assert.Empty(publicConstructors);
    }

    [Fact]
    public void Configuration_is_loaded_exactly_once_no_matter_how_often_it_is_read()
    {
        for (var i = 0; i < 10; i++)
        {
            _ = AppConfig.Instance.Get("appName");
        }

        Assert.Equal(1, AppConfig.LoadCount);
    }

    [Fact]
    public async Task Concurrent_callers_all_receive_the_same_instance()
    {
        var seen = await Task.WhenAll(Enumerable.Range(0, 16).Select(_ => Task.Run(() => AppConfig.Instance)));

        Assert.Single(seen.Distinct());
        Assert.Same(AppConfig.Instance, seen[0]);
        Assert.Equal(1, AppConfig.LoadCount);
    }

    [Theory]
    [InlineData("appName", "Shop API")]
    [InlineData("environment", "production")]
    [InlineData("maxConnections", "20")]
    [InlineData("timeoutSeconds", "30")]
    public void Get_returns_the_known_settings(string key, string expected)
    {
        Assert.Equal(expected, AppConfig.Instance.Get(key));
    }

    [Fact]
    public void Get_rejects_an_unknown_setting()
    {
        var error = Assert.Throws<KeyNotFoundException>(() => AppConfig.Instance.Get("missing"));

        Assert.Equal("Unknown setting 'missing'", error.Message);
    }

    [Fact]
    public void Unrelated_modules_share_the_same_configuration()
    {
        var database = new DatabaseModule();
        var api = new ApiModule();

        Assert.Same(database.Config, api.Config);
        Assert.Same(AppConfig.Instance, database.Config);
    }

    [Fact]
    public void Modules_start_with_values_read_from_the_shared_instance()
    {
        _ = AppConfig.Instance; // make sure the one-time loading line is not part of the capture
        using var console = new ConsoleCapture();

        new DatabaseModule().Start();
        new ApiModule().Start();

        Assert.Equal(
            "DatabaseModule: opening pool with maxConnections=20 (production)\n" +
            "ApiModule: serving \"Shop API\" with timeoutSeconds=30\n",
            console.Output);
    }
}
