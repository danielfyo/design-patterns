namespace DesignPatterns.Visitor;

/// <summary>
/// Element: every cart item can "accept" a visitor. This is the first half of
/// double dispatch — the call is resolved by the item's runtime type.
/// </summary>
public interface ICartItem
{
    string Name { get; }
    decimal Price { get; }
    decimal WeightKg { get; }
    void Accept(ICartVisitor visitor);
}

/// <summary>Concrete Element: calls the visitor method that matches its own type.</summary>
public sealed record Book(string Name, decimal Price, decimal WeightKg) : ICartItem
{
    public void Accept(ICartVisitor visitor) => visitor.VisitBook(this);
}

/// <summary>Concrete Element.</summary>
public sealed record Electronics(string Name, decimal Price, decimal WeightKg) : ICartItem
{
    public void Accept(ICartVisitor visitor) => visitor.VisitElectronics(this);
}

/// <summary>Concrete Element.</summary>
public sealed record Food(string Name, decimal Price, decimal WeightKg) : ICartItem
{
    public void Accept(ICartVisitor visitor) => visitor.VisitFood(this);
}

/// <summary>
/// Visitor: one method per concrete element type. This is the second half of
/// double dispatch — the call is resolved by the visitor's runtime type.
/// </summary>
public interface ICartVisitor
{
    void VisitBook(Book book);
    void VisitElectronics(Electronics electronics);
    void VisitFood(Food food);
}

/// <summary>Concrete Visitor: prints one receipt line per item and sums the subtotal.</summary>
public sealed class ReceiptPrinter : ICartVisitor
{
    public decimal Subtotal { get; private set; }

    public void VisitBook(Book book) => Print("[Book]", book);
    public void VisitElectronics(Electronics electronics) => Print("[Electronics]", electronics);
    public void VisitFood(Food food) => Print("[Food]", food);

    private void Print(string label, ICartItem item)
    {
        Console.WriteLine($"  {label,-13} {item.Name,-14} {Money.Format(item.Price),8}  {item.WeightKg:0.00}kg");
        Subtotal += item.Price;
    }
}

/// <summary>Concrete Visitor: VAT depends on the kind of product.</summary>
public sealed class TaxCalculator : ICartVisitor
{
    public decimal Total { get; private set; }

    public void VisitBook(Book book) => Apply(book, "books 4%", 0.04m);
    public void VisitElectronics(Electronics electronics) => Apply(electronics, "electronics 21%", 0.21m);
    public void VisitFood(Food food) => Apply(food, "food 10%", 0.10m);

    private void Apply(ICartItem item, string label, decimal rate)
    {
        var tax = Money.Round(item.Price * rate);
        Console.WriteLine($"  {item.Name,-14} {label,-17} {Money.Format(tax),8}");
        Total += tax;
    }
}

/// <summary>Concrete Visitor: shipping rules by product type and weight.</summary>
public sealed class ShippingCostCalculator : ICartVisitor
{
    public decimal Total { get; private set; }

    public void VisitBook(Book book) => Add(book, "flat rate", 1.50m);

    public void VisitElectronics(Electronics electronics) =>
        Add(electronics, "$4.00 + $1.20/kg", 4.00m + 1.20m * electronics.WeightKg);

    public void VisitFood(Food food) =>
        Add(food, "$2.50/kg, min $3.00", Math.Max(3.00m, 2.50m * food.WeightKg));

    private void Add(ICartItem item, string rule, decimal cost)
    {
        cost = Money.Round(cost);
        Console.WriteLine($"  {item.Name,-14} {rule,-20} {Money.Format(cost),8}");
        Total += cost;
    }
}

internal static class Money
{
    public static decimal Round(decimal amount) => Math.Round(amount, 2, MidpointRounding.AwayFromZero);
    public static string Format(decimal amount) => $"${amount:0.00}";
}
