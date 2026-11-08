using DesignPatterns.Observer;

Console.WriteLine("=== Observer Pattern: Stock price ticker ===");

var ticker = new StockTicker();
var display = new PriceDisplay();

// The subject only knows the IStockObserver interface.
ticker.Subscribe(display);
ticker.Subscribe(new PriceAlert("AAPL", 200.00m));
ticker.Subscribe(new PortfolioTracker(new Dictionary<string, int> { ["AAPL"] = 10, ["MSFT"] = 5 }));

ticker.SetPrice("AAPL", 195.50m);
ticker.SetPrice("MSFT", 410.20m);
ticker.SetPrice("AAPL", 201.25m);

ticker.Unsubscribe(display);
Console.WriteLine("-- display unsubscribed --");

ticker.SetPrice("AAPL", 203.10m);
ticker.SetPrice("GOOG", 172.40m);   // nobody cares about GOOG: no reactions
ticker.SetPrice("MSFT", 398.00m);
