using DesignPatterns.Facade;

Console.WriteLine("=== Facade Pattern: E-commerce order placement ===");

var inventory = new InventoryService();
var shop = new OrderFacade(inventory, new PaymentService(), new ShippingService(), new NotificationService());

PlaceAndReport(1, new Customer("Alice", "alice@example.com"),
    [new OrderItem("keyboard", 2), new OrderItem("mouse", 1)]);
Console.WriteLine();
PlaceAndReport(2, new Customer("Bob", "bob@example.com"),
    [new OrderItem("monitor", 1), new OrderItem("webcam", 5)]);
Console.WriteLine();

string[] skus = ["keyboard", "mouse", "monitor", "webcam"];
Console.WriteLine($"Stock after both orders: {string.Join(", ", skus.Select(s => $"{s}={inventory.StockOf(s)}"))}");

// The client makes ONE call per order; the facade does the orchestration.
void PlaceAndReport(int number, Customer customer, OrderItem[] items)
{
    Console.WriteLine($"Order {number}: {customer.Name} buys {string.Join(", ", items.Select(i => $"{i.Quantity} x {i.Sku}"))}");
    var result = shop.PlaceOrder(customer, items, "4242 4242 4242 4242");
    Console.WriteLine(result.Success
        ? $"Result: success=true, total=${result.Total:0.00}, tracking={result.Tracking}"
        : $"Result: success=false, error={result.Error}");
}
