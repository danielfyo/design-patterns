namespace DesignPatterns.Facade;

public sealed record Customer(string Name, string Email);

public sealed record OrderItem(string Sku, int Quantity);

/// <summary>What the facade returns: one simple value instead of four subsystem results.</summary>
public sealed record OrderResult(bool Success, decimal Total, string? Tracking, string? Error);

/// <summary>Subsystem class: knows prices and stock levels, and reserves/releases units.</summary>
public sealed class InventoryService
{
    private readonly Dictionary<string, decimal> _prices = new()
    {
        ["keyboard"] = 79.99m, ["mouse"] = 29.99m, ["monitor"] = 199.00m, ["webcam"] = 49.50m,
    };

    private readonly Dictionary<string, int> _stock = new()
    {
        ["keyboard"] = 10, ["mouse"] = 5, ["monitor"] = 5, ["webcam"] = 3,
    };

    public decimal PriceOf(string sku) => _prices[sku];

    public int StockOf(string sku) => _stock[sku];

    public bool IsAvailable(string sku, int quantity)
    {
        var inStock = _stock[sku];
        var ok = inStock >= quantity;
        Console.WriteLine(ok
            ? $"  [inventory] check {sku} x{quantity}: ok ({inStock} in stock)"
            : $"  [inventory] check {sku} x{quantity}: only {inStock} in stock");
        return ok;
    }

    public void Reserve(string sku, int quantity)
    {
        _stock[sku] -= quantity;
        Console.WriteLine($"  [inventory] reserved {sku} x{quantity}");
    }

    public void Release(string sku, int quantity)
    {
        _stock[sku] += quantity;
        Console.WriteLine($"  [inventory] released {sku} x{quantity} (rollback)");
    }
}

/// <summary>Subsystem class: charges and refunds cards (simulated payment gateway).</summary>
public sealed class PaymentService
{
    private int _nextTransaction = 1001;

    public string Charge(string cardNumber, decimal amount)
    {
        var transactionId = $"TXN-{_nextTransaction++}";
        Console.WriteLine($"  [payment] charged ${amount:0.00} to card ending {cardNumber[^4..]} ({transactionId})");
        return transactionId;
    }

    public void Refund(string transactionId, decimal amount) =>
        Console.WriteLine($"  [payment] refunded ${amount:0.00} ({transactionId})");
}

/// <summary>Subsystem class: books shipments with the carrier.</summary>
public sealed class ShippingService
{
    private int _nextShipment = 5001;

    public string CreateShipment(Customer customer, IReadOnlyList<OrderItem> items)
    {
        var tracking = $"SHP-{_nextShipment++}";
        Console.WriteLine($"  [shipping] shipment {tracking} created for {customer.Name} ({items.Sum(i => i.Quantity)} items)");
        return tracking;
    }
}

/// <summary>Subsystem class: sends e-mails to customers.</summary>
public sealed class NotificationService
{
    public void SendEmail(string to, string message) =>
        Console.WriteLine($"  [email] to {to}: {message}");
}
