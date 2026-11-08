using DesignPatterns.Adapter;

namespace DesignPatterns.Tests.Structural;

[Collection("Console")]
public sealed class AdapterTests
{
    private const string Merchant = "MERCHANT-42";

    private static PayProAdapter NewAdapter() => new(new LegacyPayProSdk(), Merchant);

    /// <summary>A Target implementation that records what the client asked for.</summary>
    private sealed class RecordingProcessor : IPaymentProcessor
    {
        public List<(decimal Amount, string Currency)> Calls { get; } = [];

        public string Name => "Recording";

        public PaymentResult Pay(decimal amount, string currency)
        {
            Calls.Add((amount, currency));
            return new PaymentResult(true, "REC-1", "Recorded");
        }
    }

    [Fact]
    public void Adapter_is_usable_wherever_the_target_interface_is_expected()
    {
        IPaymentProcessor processor = NewAdapter();

        Assert.Equal("PayPro (adapted)", processor.Name);
    }

    [Fact]
    public void Adapter_translates_dollars_to_cents_and_adds_the_merchant_id()
    {
        using var console = new ConsoleCapture();

        NewAdapter().Pay(49.99m, "USD");

        Assert.Contains("[paypro-sdk] makeTransaction(4999, \"USD\", \"MERCHANT-42\") -> \"00|PP-000001\"", console.Output);
    }

    [Fact]
    public void Adapter_rounds_half_cents_away_from_zero()
    {
        using var console = new ConsoleCapture();

        NewAdapter().Pay(10.125m, "USD");

        Assert.Contains("makeTransaction(1013, ", console.Output);
    }

    [Fact]
    public void Approved_code_becomes_a_successful_result_with_the_sdk_reference()
    {
        using var console = new ConsoleCapture();
        var adapter = NewAdapter();

        var first = adapter.Pay(10m, "USD");
        var second = adapter.Pay(10m, "EUR");

        Assert.Equal(new PaymentResult(true, "PP-000001", "Approved"), first);
        Assert.Equal(new PaymentResult(true, "PP-000002", "Approved"), second);
    }

    [Theory]
    [InlineData(19.50, "GBP", "Currency not supported by PayPro")]
    [InlineData(750.00, "USD", "Declined: amount over limit")]
    public void Error_codes_become_failed_results_with_a_readable_message(double amount, string currency, string message)
    {
        using var console = new ConsoleCapture();

        var result = NewAdapter().Pay((decimal)amount, currency);

        Assert.Equal(new PaymentResult(false, null, message), result);
    }

    [Fact]
    public void Amount_exactly_at_the_sdk_limit_is_still_approved()
    {
        using var console = new ConsoleCapture();

        Assert.True(NewAdapter().Pay(500.00m, "USD").Success);
    }

    [Fact]
    public void Wallet_debits_its_balance_and_rejects_payments_it_cannot_cover()
    {
        using var console = new ConsoleCapture();
        var wallet = new InternalWalletProcessor(100m);

        var paid = wallet.Pay(49.99m, "USD");
        var rejected = wallet.Pay(75m, "USD");
        var exact = wallet.Pay(50.01m, "USD");

        Assert.Equal(new PaymentResult(true, "WAL-0001", "Paid from wallet"), paid);
        Assert.Equal(new PaymentResult(false, null, "Insufficient wallet balance"), rejected);
        Assert.Equal(new PaymentResult(true, "WAL-0002", "Paid from wallet"), exact);
    }

    [Fact]
    public void Checkout_only_depends_on_the_target_interface()
    {
        using var console = new ConsoleCapture();
        var processor = new RecordingProcessor();

        var result = new CheckoutService(processor).Checkout("A-1", 12.50m, "EUR");

        Assert.Equal([(12.50m, "EUR")], processor.Calls);
        Assert.Equal("REC-1", result.TransactionId);
        Assert.Equal(
            "  Order A-1: 12.50 EUR\n    result: success=true, id=REC-1, message=Recorded\n",
            console.Output);
    }

    [Fact]
    public void Checkout_runs_unchanged_against_the_adapted_sdk()
    {
        using var console = new ConsoleCapture();

        var result = new CheckoutService(NewAdapter()).Checkout("A-1004", 19.50m, "GBP");

        Assert.False(result.Success);
        Assert.Equal(
            "  Order A-1004: 19.50 GBP\n" +
            "    [adapter] 19.50 GBP -> 1950 cents, merchant MERCHANT-42\n" +
            "    [paypro-sdk] makeTransaction(1950, \"GBP\", \"MERCHANT-42\") -> \"14|\"\n" +
            "    result: success=false, id=-, message=Currency not supported by PayPro\n",
            console.Output);
    }
}
