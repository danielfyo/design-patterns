using DesignPatterns.State;

namespace DesignPatterns.Tests.Behavioral;

[Collection("Console")]
public sealed class StateTests
{
    private static Order OrderIn(string state)
    {
        var order = new Order(1);
        switch (state)
        {
            case "Paid":
                order.Pay();
                break;
            case "Shipped":
                order.Pay();
                order.Ship();
                break;
            case "Delivered":
                order.Pay();
                order.Ship();
                order.Deliver();
                break;
            case "Cancelled":
                order.Cancel();
                break;
        }
        return order;
    }

    private static void Perform(Order order, string action)
    {
        switch (action)
        {
            case "pay": order.Pay(); break;
            case "ship": order.Ship(); break;
            case "deliver": order.Deliver(); break;
            case "cancel": order.Cancel(); break;
            default: throw new ArgumentOutOfRangeException(nameof(action), action, null);
        }
    }

    [Fact]
    public void New_order_starts_pending()
    {
        using var console = new ConsoleCapture();

        var order = new Order(42);

        Assert.Equal(42, order.Id);
        Assert.IsType<PendingState>(order.State);
        Assert.Equal("Pending", order.State.Name);
    }

    [Fact]
    public void Happy_path_walks_through_every_state_until_delivered()
    {
        using var console = new ConsoleCapture();
        var order = new Order(1);

        order.Pay();
        Assert.IsType<PaidState>(order.State);
        order.Ship();
        Assert.IsType<ShippedState>(order.State);
        order.Deliver();

        Assert.IsType<DeliveredState>(order.State);
        Assert.Equal(
            "> pay()\n  Payment accepted: Pending -> Paid\n"
            + "> ship()\n  Order handed to the carrier: Paid -> Shipped\n"
            + "> deliver()\n  Order delivered to the customer: Shipped -> Delivered\n",
            console.Output);
    }

    [Theory]
    [InlineData("Pending", "Order cancelled, nothing to refund")]
    [InlineData("Paid", "Order cancelled, payment refunded")]
    public void Cancelling_before_shipping_moves_to_cancelled(string from, string note)
    {
        using var console = new ConsoleCapture();
        var order = OrderIn(from);

        order.Cancel();

        Assert.IsType<CancelledState>(order.State);
        Assert.EndsWith($"  {note}: {from} -> Cancelled\n", console.Output, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Pending", "ship", "Cannot ship an order that has not been paid")]
    [InlineData("Pending", "deliver", "Cannot deliver an order that has not been shipped")]
    [InlineData("Paid", "pay", "Order has already been paid")]
    [InlineData("Paid", "deliver", "Cannot deliver an order that has not been shipped")]
    [InlineData("Shipped", "ship", "Order has already been shipped")]
    [InlineData("Shipped", "cancel", "Cannot cancel an order that has already been shipped")]
    [InlineData("Delivered", "deliver", "Order has already been delivered")]
    [InlineData("Delivered", "cancel", "Cannot cancel a delivered order")]
    [InlineData("Cancelled", "pay", "Cannot pay for a cancelled order")]
    [InlineData("Cancelled", "cancel", "Order is already cancelled")]
    public void Invalid_transition_is_rejected_and_the_state_is_kept(string from, string action, string error)
    {
        using var console = new ConsoleCapture();
        var order = OrderIn(from);
        var before = order.State;

        Perform(order, action);

        Assert.Same(before, order.State);
        Assert.EndsWith($"> {action}()\n  ERROR: {error}\n", console.Output, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Delivered")]
    [InlineData("Cancelled")]
    public void Final_states_reject_every_action(string final)
    {
        using var console = new ConsoleCapture();
        var order = OrderIn(final);
        var before = order.State;

        foreach (var action in new[] { "pay", "ship", "deliver", "cancel" })
            Perform(order, action);

        Assert.Same(before, order.State);
        var errors = console.Output.Split('\n').Count(l => l.StartsWith("  ERROR:", StringComparison.Ordinal));
        Assert.Equal(4, errors);
    }

    [Fact]
    public void Same_action_behaves_differently_depending_on_the_state()
    {
        using var console = new ConsoleCapture();
        var pending = OrderIn("Pending");
        var paid = OrderIn("Paid");

        pending.Ship();
        paid.Ship();

        Assert.IsType<PendingState>(pending.State);
        Assert.IsType<ShippedState>(paid.State);
    }
}
