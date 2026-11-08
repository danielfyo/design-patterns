using DesignPatterns.Builder;

namespace DesignPatterns.Tests.Creational;

public sealed class BuilderTests
{
    private const string Url = "https://api.example.com/users";

    [Fact]
    public void Build_applies_sensible_defaults_to_unset_parts()
    {
        var request = new HttpRequestBuilder().Url(Url).Build();

        Assert.Equal("GET", request.Method);
        Assert.Equal(Url, request.Url);
        Assert.Empty(request.Headers);
        Assert.Empty(request.Query);
        Assert.Null(request.Body);
        Assert.Equal(30, request.TimeoutSeconds);
    }

    [Fact]
    public void Fluent_steps_collect_every_part_and_render_keys_in_ordinal_order()
    {
        var request = new HttpRequestBuilder()
            .Method("put")
            .Url(Url)
            .Header("x-trace", "1")
            .Header("Accept", "text/plain")
            .Header("Accept", "application/json")
            .Query("sort", "name")
            .Query("page", "2")
            .Body("{}")
            .Timeout(5)
            .Build();

        Assert.Equal(
            "PUT https://api.example.com/users?page=2&sort=name\n" +
            "  Accept: application/json\n" +
            "  x-trace: 1\n" +
            "  timeout: 5s\n" +
            "  body: {}",
            request.ToString());
    }

    [Theory]
    [InlineData("no url", "url is required")]
    [InlineData("GET with body", "GET requests cannot have a body")]
    [InlineData("HEAD with body", "HEAD requests cannot have a body")]
    [InlineData("timeout 0", "timeout must be positive")]
    [InlineData("negative timeout", "timeout must be positive")]
    public void Build_validates_the_combination_of_parts(string scenario, string error)
    {
        HttpRequestBuilder builder = scenario switch
        {
            "no url" => new HttpRequestBuilder().Method("GET"),
            "GET with body" => new HttpRequestBuilder().Url(Url).Body("{}"),
            "HEAD with body" => new HttpRequestBuilder().Method("head").Url(Url).Body("{}"),
            "timeout 0" => new HttpRequestBuilder().Url(Url).Timeout(0),
            _ => new HttpRequestBuilder().Url(Url).Timeout(-1),
        };

        var ex = Assert.Throws<InvalidOperationException>(() => builder.Build());

        Assert.Equal(error, ex.Message);
    }

    [Fact]
    public void Built_request_is_a_snapshot_unaffected_by_later_builder_steps()
    {
        var builder = new HttpRequestBuilder().Url(Url).Header("Accept", "application/json");
        var first = builder.Build();

        var second = builder.Header("X-Debug", "true").Query("page", "3").Timeout(1).Build();

        Assert.Single(first.Headers);
        Assert.Empty(first.Query);
        Assert.Equal(30, first.TimeoutSeconds);
        Assert.Equal(2, second.Headers.Count);
        Assert.Equal("3", second.Query["page"]);
    }

    [Fact]
    public void Director_json_post_preset_drives_the_builder_through_its_steps()
    {
        var request = RequestDirector.JsonPost("https://api.example.com/orders", "{\"qty\":2}").Build();

        Assert.Equal("POST", request.Method);
        Assert.Equal("application/json", request.Headers["Accept"]);
        Assert.Equal("application/json", request.Headers["Content-Type"]);
        Assert.Equal("{\"qty\":2}", request.Body);
    }

    [Fact]
    public void Director_preset_returns_a_builder_that_accepts_extra_steps()
    {
        var request = RequestDirector.AuthenticatedGet("https://api.example.com/me", "t0k")
            .Query("lang", "en")
            .Timeout(10)
            .Build();

        Assert.Equal("GET", request.Method);
        Assert.Equal("Bearer t0k", request.Headers["Authorization"]);
        Assert.Equal("en", request.Query["lang"]);
        Assert.Equal(10, request.TimeoutSeconds);
        Assert.Null(request.Body);
    }

    [Fact]
    public void Each_director_call_starts_from_a_fresh_builder()
    {
        var first = RequestDirector.AuthenticatedGet(Url, "a");
        var second = RequestDirector.AuthenticatedGet(Url, "b");

        first.Header("X-Only-First", "1");

        Assert.False(second.Build().Headers.ContainsKey("X-Only-First"));
        Assert.NotSame(first, second);
    }
}
