using DesignPatterns.Adapter;

Console.WriteLine("=== Adapter Pattern: Payment gateway integration ===");

// The wallet implements IPaymentProcessor natively; the legacy SDK is wrapped by an adapter.
IPaymentProcessor wallet = new InternalWalletProcessor(100.00m);
IPaymentProcessor payPro = new PayProAdapter(new LegacyPayProSdk(), "MERCHANT-42");

(IPaymentProcessor Processor, (string Id, decimal Amount, string Currency)[] Orders)[] runs =
[
    (wallet, [("A-1001", 49.99m, "USD"), ("A-1002", 75.00m, "USD")]),
    (payPro, [("A-1003", 49.99m, "USD"), ("A-1004", 19.50m, "GBP"), ("A-1005", 750.00m, "USD")]),
];

foreach (var (processor, orders) in runs)
{
    Console.WriteLine($"Checkout with {processor.Name}");
    // The same CheckoutService code runs against both processors.
    var checkout = new CheckoutService(processor);
    foreach (var (id, amount, currency) in orders)
    {
        checkout.Checkout(id, amount, currency);
    }
}
