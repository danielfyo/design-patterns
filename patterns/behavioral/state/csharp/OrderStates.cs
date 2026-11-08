namespace DesignPatterns.State;

/// <summary>
/// The Context: an order that delegates every action to its current state object.
/// It contains no <c>switch</c> on a status field; the state decides what happens.
/// </summary>
public sealed class Order(int id)
{
    public int Id { get; } = id;

    /// <summary>The current state. Only states change it, through <see cref="TransitionTo"/>.</summary>
    public OrderState State { get; private set; } = new PendingState();

    public void Pay() { Announce("pay"); State.Pay(this); }
    public void Ship() { Announce("ship"); State.Ship(this); }
    public void Deliver() { Announce("deliver"); State.Deliver(this); }
    public void Cancel() { Announce("cancel"); State.Cancel(this); }

    /// <summary>Called by the states themselves: states know their successors.</summary>
    internal void TransitionTo(OrderState next, string note)
    {
        Console.WriteLine($"  {note}: {State.Name} -> {next.Name}");
        State = next;
    }

    private static void Announce(string action) => Console.WriteLine($"> {action}()");
}

/// <summary>
/// The State: declares one method per action of the context. Each concrete state
/// decides which actions are valid and which state comes next.
/// </summary>
public abstract class OrderState
{
    public abstract string Name { get; }
    public abstract void Pay(Order order);
    public abstract void Ship(Order order);
    public abstract void Deliver(Order order);
    public abstract void Cancel(Order order);

    /// <summary>Shared helper for invalid actions: the state stays the same.</summary>
    protected static void Reject(string reason) => Console.WriteLine($"  ERROR: {reason}");
}

/// <summary>Concrete State: created but not paid yet.</summary>
public sealed class PendingState : OrderState
{
    public override string Name => "Pending";
    public override void Pay(Order order) => order.TransitionTo(new PaidState(), "Payment accepted");
    public override void Ship(Order order) => Reject("Cannot ship an order that has not been paid");
    public override void Deliver(Order order) => Reject("Cannot deliver an order that has not been shipped");
    public override void Cancel(Order order) => order.TransitionTo(new CancelledState(), "Order cancelled, nothing to refund");
}

/// <summary>Concrete State: paid and waiting to be shipped.</summary>
public sealed class PaidState : OrderState
{
    public override string Name => "Paid";
    public override void Pay(Order order) => Reject("Order has already been paid");
    public override void Ship(Order order) => order.TransitionTo(new ShippedState(), "Order handed to the carrier");
    public override void Deliver(Order order) => Reject("Cannot deliver an order that has not been shipped");
    public override void Cancel(Order order) => order.TransitionTo(new CancelledState(), "Order cancelled, payment refunded");
}

/// <summary>Concrete State: on its way to the customer.</summary>
public sealed class ShippedState : OrderState
{
    public override string Name => "Shipped";
    public override void Pay(Order order) => Reject("Order has already been paid");
    public override void Ship(Order order) => Reject("Order has already been shipped");
    public override void Deliver(Order order) => order.TransitionTo(new DeliveredState(), "Order delivered to the customer");
    public override void Cancel(Order order) => Reject("Cannot cancel an order that has already been shipped");
}

/// <summary>Concrete State: final state, every action is rejected.</summary>
public sealed class DeliveredState : OrderState
{
    public override string Name => "Delivered";
    public override void Pay(Order order) => Reject("Order has already been paid");
    public override void Ship(Order order) => Reject("Order has already been delivered");
    public override void Deliver(Order order) => Reject("Order has already been delivered");
    public override void Cancel(Order order) => Reject("Cannot cancel a delivered order");
}

/// <summary>Concrete State: final state reached by cancelling.</summary>
public sealed class CancelledState : OrderState
{
    public override string Name => "Cancelled";
    public override void Pay(Order order) => Reject("Cannot pay for a cancelled order");
    public override void Ship(Order order) => Reject("Cannot ship a cancelled order");
    public override void Deliver(Order order) => Reject("Cannot deliver a cancelled order");
    public override void Cancel(Order order) => Reject("Order is already cancelled");
}
