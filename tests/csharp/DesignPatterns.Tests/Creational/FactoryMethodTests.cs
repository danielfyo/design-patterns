using DesignPatterns.FactoryMethod;

namespace DesignPatterns.Tests.Creational;

public sealed class FactoryMethodTests
{
    private static readonly User Alice = new("Alice", "alice@example.com", "+1-555-0100", "device-a1b2");

    [Theory]
    [InlineData(typeof(EmailService), "EMAIL to alice@example.com: \"Hi Alice, your order shipped.\"")]
    [InlineData(typeof(SmsService), "SMS to +1-555-0100: \"Hi Alice, your order shipped.\"")]
    [InlineData(typeof(PushService), "PUSH to device-a1b2: \"Hi Alice, your order shipped.\"")]
    public void Each_concrete_creator_delivers_through_its_own_product(Type serviceType, string expected)
    {
        var service = (NotificationService)Activator.CreateInstance(serviceType)!;

        Assert.Equal(expected, service.Notify(Alice, "your order shipped."));
        Assert.Equal(serviceType.Name, service.Name);
    }

    [Fact]
    public void Sms_product_truncates_long_messages_to_the_maximum_length()
    {
        var receipt = new SmsNotifier().Send(Alice, new string('a', 40));

        Assert.Equal($"SMS to +1-555-0100: \"{new string('a', SmsNotifier.MaxLength - 3)}...\"", receipt);
    }

    [Fact]
    public void Sms_product_keeps_a_message_that_fits_exactly()
    {
        var message = new string('b', SmsNotifier.MaxLength);

        Assert.Equal($"SMS to +1-555-0100: \"{message}\"", new SmsNotifier().Send(Alice, message));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Creator_rejects_a_blank_message_for_every_channel(string message)
    {
        NotificationService[] services = [new EmailService(), new SmsService(), new PushService()];

        foreach (var service in services)
        {
            var ex = Assert.Throws<ArgumentException>(() => service.Notify(Alice, message));
            Assert.Equal("message must not be empty", ex.Message);
        }
    }

    [Fact]
    public void Shared_business_logic_works_with_any_product_a_subclass_creates()
    {
        var service = new RecordingService();

        var receipt = service.Notify(Alice, "hello");

        Assert.Equal("FAKE Alice: Hi Alice, hello", receipt);
        Assert.Equal(1, service.Created);
    }

    [Fact]
    public void Factory_method_is_not_called_when_validation_fails()
    {
        var service = new RecordingService();

        Assert.Throws<ArgumentException>(() => service.Notify(Alice, " "));

        Assert.Equal(0, service.Created);
    }

    [Theory]
    [InlineData("email", typeof(EmailService))]
    [InlineData("sms", typeof(SmsService))]
    [InlineData("push", typeof(PushService))]
    public void Simple_factory_maps_a_channel_name_to_its_creator(string channel, Type expected)
    {
        Assert.IsType(expected, NotificationServices.FromConfig(channel));
    }

    [Theory]
    [InlineData("fax")]
    [InlineData("Email")]
    public void Simple_factory_rejects_unknown_channels(string channel)
    {
        var ex = Assert.Throws<ArgumentException>(() => NotificationServices.FromConfig(channel));

        Assert.Equal($"unknown notification channel \"{channel}\"", ex.Message);
    }

    private sealed class FakeNotifier : INotifier
    {
        public string Send(User recipient, string message) => $"FAKE {recipient.Name}: {message}";
    }

    private sealed class RecordingService : NotificationService
    {
        public int Created { get; private set; }

        public override string Name => "RecordingService";

        protected override INotifier CreateNotifier()
        {
            Created++;
            return new FakeNotifier();
        }
    }
}
