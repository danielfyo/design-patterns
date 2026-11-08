using DesignPatterns.State;

Console.WriteLine("=== State Pattern: Order lifecycle ===");

// Happy path, plus two actions that the current state rejects.
Console.WriteLine("--- Order #1001: happy path ---");
var first = new Order(1001);
Console.WriteLine($"Order #{first.Id} created [{first.State.Name}]");
first.Pay();
first.Ship();
first.Cancel();
first.Deliver();
first.Cancel();
Console.WriteLine($"Order #{first.Id} final state: {first.State.Name}");

// Same actions, different results: the behavior depends on the current state.
Console.WriteLine("--- Order #1002: cancellation ---");
var second = new Order(1002);
Console.WriteLine($"Order #{second.Id} created [{second.State.Name}]");
second.Ship();
second.Pay();
second.Cancel();
second.Deliver();
Console.WriteLine($"Order #{second.Id} final state: {second.State.Name}");
