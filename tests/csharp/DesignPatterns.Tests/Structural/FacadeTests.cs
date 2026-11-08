using DesignPatterns.Facade;

namespace DesignPatterns.Tests.Structural;

[Collection("Console")]
public sealed class FacadeTests
{
    private const string Card = "4242 4242 4242 4242";
    private static readonly Customer Alice = new("Alice", "alice@example.com");

    private static (OrderFacade Shop, InventoryService Inventory) CreateShop()
    {
        var inventory = new InventoryService();
        var shop = new OrderFacade(inventory, new PaymentService(), new ShippingService(), new NotificationService());
        return (shop, inventory);
    }

    [Fact]
    public void Successful_order_returns_total_and_tracking_and_reserves_stock()
    {
        using var console = new ConsoleCapture();
        var (shop, inventory) = CreateShop();

        var result = shop.PlaceOrder(Alice, [new OrderItem("keyboard", 2), new OrderItem("mouse", 1)], Card);

        Assert.Equal(new OrderResult(true, 189.97m, "SHP-5001", null), result);
        Assert.Equal(8, inventory.StockOf("keyboard"));
        Assert.Equal(4, inventory.StockOf("mouse"));
    }

    [Fact]
    public void Facade_calls_the_subsystems_in_order()
    {
        using var console = new ConsoleCapture();
        var (shop, _) = CreateShop();

        shop.PlaceOrder(Alice, [new OrderItem("monitor", 1)], Card);

        var tags = console.Output.Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim().Split(' ')[0])
            .ToArray();
        Assert.Equal(["[inventory]", "[inventory]", "[payment]", "[shipping]", "[email]"], tags);
    }

    [Fact]
    public void Out_of_stock_item_rolls_back_earlier_reservations()
    {
        using var console = new ConsoleCapture();
        var (shop, inventory) = CreateShop();

        var result = shop.PlaceOrder(Alice, [new OrderItem("monitor", 1), new OrderItem("webcam", 5)], Card);

        Assert.False(result.Success);
        Assert.Null(result.Tracking);
        Assert.Equal("webcam is out of stock (requested 5, available 3)", result.Error);
        Assert.Equal(5, inventory.StockOf("monitor"));
        Assert.Equal(3, inventory.StockOf("webcam"));
        Assert.Contains("released monitor x1 (rollback)", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Failed_order_never_charges_or_ships_but_notifies_the_customer()
    {
        using var console = new ConsoleCapture();
        var (shop, _) = CreateShop();

        shop.PlaceOrder(Alice, [new OrderItem("webcam", 4)], Card);

        Assert.DoesNotContain("[payment]", console.Output, StringComparison.Ordinal);
        Assert.DoesNotContain("[shipping]", console.Output, StringComparison.Ordinal);
        Assert.DoesNotContain("released", console.Output, StringComparison.Ordinal);
        Assert.Contains("[email] to alice@example.com: Order failed: webcam is out of stock", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Failed_order_does_not_consume_a_tracking_number()
    {
        using var console = new ConsoleCapture();
        var (shop, _) = CreateShop();

        shop.PlaceOrder(Alice, [new OrderItem("webcam", 9)], Card);
        var result = shop.PlaceOrder(Alice, [new OrderItem("webcam", 1)], Card);

        Assert.Equal("SHP-5001", result.Tracking);
    }

    [Fact]
    public void Consecutive_orders_share_the_subsystems_state()
    {
        using var console = new ConsoleCapture();
        var (shop, inventory) = CreateShop();

        var first = shop.PlaceOrder(Alice, [new OrderItem("webcam", 2)], Card);
        var second = shop.PlaceOrder(Alice, [new OrderItem("webcam", 2)], Card);

        Assert.Equal("SHP-5001", first.Tracking);
        Assert.False(second.Success);
        Assert.Equal("webcam is out of stock (requested 2, available 1)", second.Error);
        Assert.Equal(1, inventory.StockOf("webcam"));
    }
}
