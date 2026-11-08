using DesignPatterns.Observer;

namespace DesignPatterns.Tests.Behavioral;

[Collection("Console")]
public sealed class ObserverTests
{
    /// <summary>An observer that records every notification it gets.</summary>
    private sealed class Recorder : IStockObserver
    {
        public List<(string Symbol, decimal Price)> Updates { get; } = [];

        public void Update(string symbol, decimal price) => Updates.Add((symbol, price));
    }

    /// <summary>An observer that unsubscribes itself on its first notification.</summary>
    private sealed class OneShot(StockTicker ticker) : IStockObserver
    {
        public int Calls { get; private set; }

        public void Update(string symbol, decimal price)
        {
            Calls++;
            ticker.Unsubscribe(this);
        }
    }

    [Fact]
    public void Every_subscriber_is_notified_of_a_price_change()
    {
        using var console = new ConsoleCapture();
        var ticker = new StockTicker();
        var first = new Recorder();
        var second = new Recorder();
        ticker.Subscribe(first);
        ticker.Subscribe(second);

        ticker.SetPrice("AAPL", 195.50m);

        Assert.Equal([("AAPL", 195.50m)], first.Updates);
        Assert.Equal([("AAPL", 195.50m)], second.Updates);
        Assert.Equal("[ticker] AAPL = $195.50 (notifying 2 observers)\n", console.Output);
    }

    [Fact]
    public void Unsubscribe_stops_notifications()
    {
        using var console = new ConsoleCapture();
        var ticker = new StockTicker();
        var observer = new Recorder();
        ticker.Subscribe(observer);
        ticker.SetPrice("AAPL", 1m);

        ticker.Unsubscribe(observer);
        ticker.SetPrice("AAPL", 2m);

        Assert.Equal([("AAPL", 1m)], observer.Updates);
    }

    [Fact]
    public void Observer_may_unsubscribe_while_being_notified_without_skipping_others()
    {
        using var console = new ConsoleCapture();
        var ticker = new StockTicker();
        var oneShot = new OneShot(ticker);
        var recorder = new Recorder();
        ticker.Subscribe(oneShot);
        ticker.Subscribe(recorder);

        ticker.SetPrice("AAPL", 1m);
        ticker.SetPrice("AAPL", 2m);

        Assert.Equal(1, oneShot.Calls);
        Assert.Equal(2, recorder.Updates.Count);
    }

    [Fact]
    public void Ticker_remembers_the_latest_price_of_each_symbol()
    {
        using var console = new ConsoleCapture();
        var ticker = new StockTicker();

        ticker.SetPrice("AAPL", 1m);
        ticker.SetPrice("AAPL", 2m);

        Assert.Equal(2m, ticker.GetPrice("AAPL"));
        Assert.Null(ticker.GetPrice("GOOG"));
    }

    [Theory]
    [InlineData("AAPL", 201.25, true)]
    [InlineData("AAPL", 200.00, false)]
    [InlineData("AAPL", 150.00, false)]
    [InlineData("MSFT", 999.00, false)]
    public void Price_alert_fires_only_above_the_threshold_of_its_symbol(string symbol, double price, bool fires)
    {
        using var console = new ConsoleCapture();
        var alert = new PriceAlert("AAPL", 200m);

        alert.Update(symbol, (decimal)price);

        Assert.Equal(fires, console.Output.Contains("[alert]", StringComparison.Ordinal));
    }

    [Fact]
    public void Portfolio_tracker_values_its_holdings_and_ignores_other_symbols()
    {
        using var console = new ConsoleCapture();
        var ticker = new StockTicker();
        var portfolio = new PortfolioTracker(new Dictionary<string, int> { ["AAPL"] = 10, ["MSFT"] = 5 });
        ticker.Subscribe(portfolio);
        Assert.Equal(0m, portfolio.Value);

        ticker.SetPrice("AAPL", 195.50m);
        ticker.SetPrice("MSFT", 410.20m);
        ticker.SetPrice("GOOG", 172.40m);

        Assert.Equal(4006.00m, portfolio.Value);
        Assert.EndsWith("[ticker] GOOG = $172.40 (notifying 1 observers)\n", console.Output);
    }

    [Fact]
    public void Subject_only_depends_on_the_observer_interface()
    {
        using var console = new ConsoleCapture();
        var ticker = new StockTicker();
        ticker.Subscribe(new PriceDisplay());
        ticker.Subscribe(new Recorder());

        ticker.SetPrice("MSFT", 410.20m);

        Assert.Equal("[ticker] MSFT = $410.20 (notifying 2 observers)\n  [display] MSFT: $410.20\n", console.Output);
    }
}
