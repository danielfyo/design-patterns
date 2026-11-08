namespace DesignPatterns.Strategy;

/// <summary>Immutable data the strategies need to compute a price.</summary>
public sealed record Order(decimal Subtotal, decimal WeightKg);

/// <summary>
/// The Strategy interface: every shipping algorithm exposes the same contract,
/// so the context can use any of them interchangeably.
/// </summary>
public interface IShippingStrategy
{
    string Name { get; }
    decimal Calculate(Order order);
}

/// <summary>Concrete strategy: flat fee plus a per-kilogram rate.</summary>
public sealed class StandardShipping : IShippingStrategy
{
    public string Name => "Standard";
    public decimal Calculate(Order order) => 5.00m + 1.50m * order.WeightKg;
}

/// <summary>Concrete strategy: faster, so more expensive.</summary>
public sealed class ExpressShipping : IShippingStrategy
{
    public string Name => "Express";
    public decimal Calculate(Order order) => 15.00m + 3.00m * order.WeightKg;
}

/// <summary>
/// Concrete strategy that composes another strategy: free above a threshold,
/// otherwise it falls back to the wrapped strategy.
/// </summary>
public sealed class FreeOverThresholdShipping(decimal threshold, IShippingStrategy fallback) : IShippingStrategy
{
    public string Name => $"Free over ${threshold:0}";
    public decimal Calculate(Order order) =>
        order.Subtotal >= threshold ? 0m : fallback.Calculate(order);
}

/// <summary>Concrete strategy: the customer collects the parcel.</summary>
public sealed class StorePickup : IShippingStrategy
{
    public string Name => "Store pickup";
    public decimal Calculate(Order order) => 0m;
}

/// <summary>
/// The Context: it holds a reference to a strategy and delegates the work to it.
/// It does not know (or care) which concrete algorithm it is running.
/// </summary>
public sealed class ShippingCalculator(IShippingStrategy strategy)
{
    private IShippingStrategy _strategy = strategy;

    public IShippingStrategy Strategy
    {
        get => _strategy;
        set => _strategy = value ?? throw new ArgumentNullException(nameof(value));
    }

    public decimal Quote(Order order) => _strategy.Calculate(order);
}
