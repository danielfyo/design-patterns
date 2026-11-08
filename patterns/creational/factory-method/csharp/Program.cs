using DesignPatterns.FactoryMethod;

Console.WriteLine("=== Factory Method Pattern: Notification service ===");

var alice = new User("Alice", "alice@example.com", "+1-555-0100", "device-a1b2");
var bob = new User("Bob", "bob@example.com", "+1-555-0199", "device-c3d4");

// Client code: it only knows the abstract creator, never a concrete notifier.
static void SendShippingUpdate(NotificationService service, User user) =>
    Console.WriteLine($"  {service.Name,-12} -> {service.Notify(user, "your order #1001 has shipped.")}");

Console.WriteLine("Client code works only with the abstract NotificationService:");
NotificationService[] services = [new EmailService(), new SmsService(), new PushService()];
foreach (var service in services)
{
    SendShippingUpdate(service, alice);
}

Console.WriteLine("Config-driven selection (a simple factory picks the creator):");
foreach (var channel in new[] { "push", "email", "fax" })
{
    try
    {
        var service = NotificationServices.FromConfig(channel);
        Console.WriteLine($"  channel={channel,-6} -> {service.Name}");
        Console.WriteLine($"    {service.Notify(bob, "your password was changed.")}");
    }
    catch (ArgumentException ex)
    {
        Console.WriteLine($"  channel={channel,-6} -> error: {ex.Message}");
    }
}

Console.WriteLine("Shared business rules live in the creator:");
NotificationService sms = new SmsService();
try
{
    sms.Notify(alice, "   ");
}
catch (ArgumentException ex)
{
    Console.WriteLine($"  {sms.Name,-12} -> error: {ex.Message}");
}
