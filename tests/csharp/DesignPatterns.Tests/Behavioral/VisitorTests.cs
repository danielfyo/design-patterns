using DesignPatterns.Visitor;

namespace DesignPatterns.Tests.Behavioral;

[Collection("Console")]
public sealed class VisitorTests
{
    private static readonly ICartItem[] Cart =
    [
        new Book("Clean Code", 32.50m, 0.80m),
        new Electronics("Headphones", 59.90m, 0.40m),
        new Food("Coffee beans", 12.00m, 1.50m),
        new Electronics("Monitor", 199.00m, 5.50m),
        new Food("Chocolate", 3.50m, 0.20m),
    ];

    /// <summary>A visitor that only records which Visit method each element called.</summary>
    private sealed class KindRecorder : ICartVisitor
    {
        public List<string> Visits { get; } = [];
        public void VisitBook(Book book) => Visits.Add($"book:{book.Name}");
        public void VisitElectronics(Electronics electronics) => Visits.Add($"electronics:{electronics.Name}");
        public void VisitFood(Food food) => Visits.Add($"food:{food.Name}");
    }

    private static void VisitAll(ICartVisitor visitor, params ICartItem[] items)
    {
        foreach (var item in items) item.Accept(visitor);
    }

    [Fact]
    public void Each_element_dispatches_to_the_visit_method_of_its_own_type()
    {
        var recorder = new KindRecorder();

        VisitAll(recorder, Cart);

        Assert.Equal(
            ["book:Clean Code", "electronics:Headphones", "food:Coffee beans", "electronics:Monitor", "food:Chocolate"],
            recorder.Visits);
    }

    [Theory]
    [InlineData("book", 1.00)]
    [InlineData("electronics", 5.25)]
    [InlineData("food", 2.50)]
    public void Tax_rate_depends_on_the_element_type(string kind, double expected)
    {
        using var console = new ConsoleCapture();
        ICartItem item = kind switch
        {
            "book" => new Book("Item", 25m, 1m),
            "electronics" => new Electronics("Item", 25m, 1m),
            _ => new Food("Item", 25m, 1m),
        };
        var tax = new TaxCalculator();

        item.Accept(tax);

        Assert.Equal((decimal)expected, tax.Total);
    }

    [Fact]
    public void Tax_is_rounded_half_up_per_item()
    {
        using var console = new ConsoleCapture();
        var tax = new TaxCalculator();

        VisitAll(tax, new Electronics("Headphones", 59.90m, 0.40m), new Food("Chocolate", 0.05m, 0.1m));

        Assert.Equal(12.58m + 0.01m, tax.Total);
    }

    [Theory]
    [InlineData(0.20, 3.00)]
    [InlineData(1.50, 3.75)]
    public void Food_shipping_is_per_kg_with_a_minimum(double weightKg, double expected)
    {
        using var console = new ConsoleCapture();
        var shipping = new ShippingCostCalculator();

        new Food("Food", 1m, (decimal)weightKg).Accept(shipping);

        Assert.Equal((decimal)expected, shipping.Total);
    }

    [Fact]
    public void Shipping_uses_a_different_rule_for_each_element_type()
    {
        using var console = new ConsoleCapture();
        var shipping = new ShippingCostCalculator();

        VisitAll(shipping, new Book("B", 100m, 9m));
        Assert.Equal(1.50m, shipping.Total);
        VisitAll(shipping, new Electronics("E", 100m, 5.50m));

        Assert.Equal(1.50m + 10.60m, shipping.Total);
    }

    [Fact]
    public void Each_visitor_is_a_separate_operation_over_the_same_cart()
    {
        using var console = new ConsoleCapture();
        var receipt = new ReceiptPrinter();
        var tax = new TaxCalculator();
        var shipping = new ShippingCostCalculator();

        VisitAll(receipt, Cart);
        VisitAll(tax, Cart);
        VisitAll(shipping, Cart);

        Assert.Equal(306.90m, receipt.Subtotal);
        Assert.Equal(57.22m, tax.Total);
        Assert.Equal(23.33m, shipping.Total);
    }

    [Fact]
    public void Receipt_printer_labels_each_line_with_the_element_type()
    {
        using var console = new ConsoleCapture();

        VisitAll(new ReceiptPrinter(), new Book("Clean Code", 32.50m, 0.80m), new Food("Chocolate", 3.50m, 0.20m));

        Assert.Equal(
            "  [Book]        Clean Code       $32.50  0.80kg\n"
            + "  [Food]        Chocolate         $3.50  0.20kg\n",
            console.Output);
    }
}
