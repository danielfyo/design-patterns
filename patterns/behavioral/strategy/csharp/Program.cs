using DesignPatterns.Strategy;

Console.WriteLine("=== Strategy Pattern: Shipping cost calculator ===");

IShippingStrategy[] strategies =
[
    new StandardShipping(),
    new ExpressShipping(),
    new FreeOverThresholdShipping(100m, new StandardShipping()),
    new StorePickup(),
];

Order[] orders = [new Order(80m, 4m), new Order(150m, 4m)];

// The same calculator is reused; only the strategy changes at runtime.
var calculator = new ShippingCalculator(strategies[0]);

foreach (var order in orders)
{
    Console.WriteLine($"Order: subtotal=${order.Subtotal:0.00}, weight={order.WeightKg:0.0}kg");
    foreach (var strategy in strategies)
    {
        calculator.Strategy = strategy;
        Console.WriteLine($"  {strategy.Name,-16} -> ${calculator.Quote(order):0.00}");
    }
}
