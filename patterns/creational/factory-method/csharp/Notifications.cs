namespace DesignPatterns.FactoryMethod;

/// <summary>The person we want to reach. Each channel uses a different address.</summary>
public sealed record User(string Name, string Email, string Phone, string DeviceId);

/// <summary>
/// Product: the common interface of every object the factory method can create.
/// The creator's business logic only ever talks to this interface.
/// </summary>
public interface INotifier
{
    string Send(User recipient, string message);
}

/// <summary>Concrete Product: delivers the message by e-mail.</summary>
public sealed class EmailNotifier : INotifier
{
    public string Send(User recipient, string message) =>
        $"EMAIL to {recipient.Email}: \"{message}\"";
}

/// <summary>Concrete Product: delivers the message by SMS, which has a length limit.</summary>
public sealed class SmsNotifier : INotifier
{
    public const int MaxLength = 32;

    public string Send(User recipient, string message)
    {
        var text = message.Length > MaxLength ? message[..(MaxLength - 3)] + "..." : message;
        return $"SMS to {recipient.Phone}: \"{text}\"";
    }
}

/// <summary>Concrete Product: delivers the message as a mobile push notification.</summary>
public sealed class PushNotifier : INotifier
{
    public string Send(User recipient, string message) =>
        $"PUSH to {recipient.DeviceId}: \"{message}\"";
}

/// <summary>
/// Creator: declares the factory method <see cref="CreateNotifier"/> and contains the
/// business logic (<see cref="Notify"/>) that works with whatever product it returns.
/// </summary>
public abstract class NotificationService
{
    public abstract string Name { get; }

    /// <summary>The factory method. Subclasses decide which concrete notifier to build.</summary>
    protected abstract INotifier CreateNotifier();

    /// <summary>
    /// Business logic shared by every channel: validate, personalize, deliver.
    /// It never mentions a concrete notifier class.
    /// </summary>
    public string Notify(User user, string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            throw new ArgumentException("message must not be empty");
        }

        INotifier notifier = CreateNotifier();
        return notifier.Send(user, $"Hi {user.Name}, {message}");
    }
}

/// <summary>Concrete Creator: overrides the factory method to return an <see cref="EmailNotifier"/>.</summary>
public sealed class EmailService : NotificationService
{
    public override string Name => "EmailService";
    protected override INotifier CreateNotifier() => new EmailNotifier();
}

/// <summary>Concrete Creator: overrides the factory method to return an <see cref="SmsNotifier"/>.</summary>
public sealed class SmsService : NotificationService
{
    public override string Name => "SmsService";
    protected override INotifier CreateNotifier() => new SmsNotifier();
}

/// <summary>Concrete Creator: overrides the factory method to return a <see cref="PushNotifier"/>.</summary>
public sealed class PushService : NotificationService
{
    public override string Name => "PushService";
    protected override INotifier CreateNotifier() => new PushNotifier();
}

/// <summary>
/// NOT the GoF pattern: a "simple factory" (static factory) that maps a configuration
/// string to a concrete creator. It is the one place that knows every channel name.
/// </summary>
public static class NotificationServices
{
    public static NotificationService FromConfig(string channel) => channel switch
    {
        "email" => new EmailService(),
        "sms" => new SmsService(),
        "push" => new PushService(),
        _ => throw new ArgumentException($"unknown notification channel \"{channel}\""),
    };
}
