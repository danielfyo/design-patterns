namespace DesignPatterns.Observer;

/// <summary>
/// The Observer interface: anything that wants to hear about price changes.
/// </summary>
public interface IStockObserver
{
    void Update(string symbol, decimal price);
}

/// <summary>
/// The Subject: keeps the latest prices and a list of observers, and notifies
/// all of them whenever a price changes. It knows nothing about what they do.
/// </summary>
public sealed class StockTicker
{
    private readonly List<IStockObserver> _observers = [];
    private readonly Dictionary<string, decimal> _prices = [];

    public void Subscribe(IStockObserver observer) => _observers.Add(observer);

    public void Unsubscribe(IStockObserver observer) => _observers.Remove(observer);

    public decimal? GetPrice(string symbol) => _prices.TryGetValue(symbol, out var p) ? p : null;

    public void SetPrice(string symbol, decimal price)
    {
        _prices[symbol] = price;
        Console.WriteLine($"[ticker] {symbol} = ${price:0.00} (notifying {_observers.Count} observers)");
        Notify(symbol, price);
    }

    private void Notify(string symbol, decimal price)
    {
        // Iterate over a copy so observers may unsubscribe while being notified.
        foreach (var observer in _observers.ToArray())
        {
            observer.Update(symbol, price);
        }
    }
}

/// <summary>Concrete Observer: shows every price it receives.</summary>
public sealed class PriceDisplay : IStockObserver
{
    public void Update(string symbol, decimal price) =>
        Console.WriteLine($"  [display] {symbol}: ${price:0.00}");
}

/// <summary>Concrete Observer: reacts only when one symbol goes above a threshold.</summary>
public sealed class PriceAlert(string watchedSymbol, decimal threshold) : IStockObserver
{
    public void Update(string symbol, decimal price)
    {
        if (symbol == watchedSymbol && price > threshold)
        {
            Console.WriteLine($"  [alert] {symbol} is above ${threshold:0.00}: now ${price:0.00}");
        }
    }
}

/// <summary>
/// Concrete Observer with its own state: remembers the last price of each
/// holding and recomputes the portfolio value when one of them changes.
/// </summary>
public sealed class PortfolioTracker(IReadOnlyDictionary<string, int> holdings) : IStockObserver
{
    private readonly Dictionary<string, decimal> _lastPrices = [];

    public decimal Value =>
        holdings.Sum(h => _lastPrices.TryGetValue(h.Key, out var p) ? p * h.Value : 0m);

    public void Update(string symbol, decimal price)
    {
        if (!holdings.ContainsKey(symbol))
        {
            return;
        }

        _lastPrices[symbol] = price;
        Console.WriteLine($"  [portfolio] value: ${Value:0.00}");
    }
}
