using DesignPatterns.Visitor;

Console.WriteLine("=== Visitor Pattern: Shopping cart: tax & shipping ===");

ICartItem[] cart =
[
    new Book("Clean Code", 32.50m, 0.80m),
    new Electronics("Headphones", 59.90m, 0.40m),
    new Food("Coffee beans", 12.00m, 1.50m),
    new Electronics("Monitor", 199.00m, 5.50m),
    new Food("Chocolate", 3.50m, 0.20m),
];

// The traversal is always the same; each visitor is a different operation.
void Visit(ICartVisitor visitor)
{
    foreach (var item in cart) item.Accept(visitor);
}

Console.WriteLine("--- ReceiptPrinter ---");
var receipt = new ReceiptPrinter();
Visit(receipt);
Console.WriteLine($"  Subtotal: ${receipt.Subtotal:0.00}");

Console.WriteLine("--- TaxCalculator ---");
var tax = new TaxCalculator();
Visit(tax);
Console.WriteLine($"  Total tax: ${tax.Total:0.00}");

Console.WriteLine("--- ShippingCostCalculator ---");
var shipping = new ShippingCostCalculator();
Visit(shipping);
Console.WriteLine($"  Total shipping: ${shipping.Total:0.00}");

var grand = receipt.Subtotal + tax.Total + shipping.Total;
Console.WriteLine(
    $"Grand total: ${receipt.Subtotal:0.00} + ${tax.Total:0.00} tax + ${shipping.Total:0.00} shipping = ${grand:0.00}");
