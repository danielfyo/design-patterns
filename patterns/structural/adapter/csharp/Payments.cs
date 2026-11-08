namespace DesignPatterns.Adapter;

/// <summary>Outcome of a payment, in the application's own vocabulary.</summary>
public sealed record PaymentResult(bool Success, string? TransactionId, string Message);

/// <summary>
/// Target: the interface the application wants to work with.
/// Amounts are decimal dollars (or euros...), currencies are ISO codes.
/// </summary>
public interface IPaymentProcessor
{
    string Name { get; }
    PaymentResult Pay(decimal amount, string currency);
}

/// <summary>
/// A native implementation of the Target: our own wallet already speaks
/// the application's interface, so it needs no adapter.
/// </summary>
public sealed class InternalWalletProcessor(decimal balance) : IPaymentProcessor
{
    private decimal _balance = balance;
    private int _nextId = 1;

    public string Name => "Internal wallet";

    public PaymentResult Pay(decimal amount, string currency)
    {
        if (amount > _balance)
        {
            Console.WriteLine($"    [wallet] insufficient balance: {_balance:0.00} < {amount:0.00}");
            return new PaymentResult(false, null, "Insufficient wallet balance");
        }

        var before = _balance;
        _balance -= amount;
        Console.WriteLine($"    [wallet] debit {amount:0.00} {currency} (balance {before:0.00} -> {_balance:0.00})");
        return new PaymentResult(true, $"WAL-{_nextId++:0000}", "Paid from wallet");
    }
}

/// <summary>
/// Adaptee: a (fictional) third-party SDK we cannot change. Its API is incompatible with ours:
/// integer cents, a merchant id on every call, and a "code|reference" string as the response.
/// </summary>
public sealed class LegacyPayProSdk
{
    private const int MaxAmountInCents = 50_000;
    private static readonly string[] SupportedCurrencies = ["USD", "EUR"];
    private int _nextReference = 1;

    /// <returns>"00|PP-000001" on success, "14|" unsupported currency, "51|" over the limit.</returns>
    public string MakeTransaction(int amountInCents, string currencyCode, string merchantId)
    {
        string response;
        if (!SupportedCurrencies.Contains(currencyCode)) response = "14|";
        else if (amountInCents > MaxAmountInCents) response = "51|";
        else response = $"00|PP-{_nextReference++:000000}";

        Console.WriteLine(
            $"    [paypro-sdk] makeTransaction({amountInCents}, \"{currencyCode}\", \"{merchantId}\") -> \"{response}\"");
        return response;
    }
}

/// <summary>
/// Adapter (object adapter): implements the Target and wraps an Adaptee instance,
/// translating each call in both directions — dollars to cents on the way in,
/// status codes to <see cref="PaymentResult"/> on the way out.
/// </summary>
public sealed class PayProAdapter(LegacyPayProSdk sdk, string merchantId) : IPaymentProcessor
{
    public string Name => "PayPro (adapted)";

    public PaymentResult Pay(decimal amount, string currency)
    {
        var cents = (int)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);
        Console.WriteLine($"    [adapter] {amount:0.00} {currency} -> {cents} cents, merchant {merchantId}");

        var parts = sdk.MakeTransaction(cents, currency, merchantId).Split('|');
        var (code, reference) = (parts[0], parts[1]);

        return code switch
        {
            "00" => new PaymentResult(true, reference, "Approved"),
            "14" => new PaymentResult(false, null, "Currency not supported by PayPro"),
            "51" => new PaymentResult(false, null, "Declined: amount over limit"),
            _ => new PaymentResult(false, null, $"Unknown PayPro status {code}"),
        };
    }
}

/// <summary>
/// Client: only knows <see cref="IPaymentProcessor"/>. It works with the native wallet and with the
/// adapted third-party SDK without a single line of gateway-specific code.
/// </summary>
public sealed class CheckoutService(IPaymentProcessor processor)
{
    public PaymentResult Checkout(string orderId, decimal amount, string currency)
    {
        Console.WriteLine($"  Order {orderId}: {amount:0.00} {currency}");
        var result = processor.Pay(amount, currency);
        Console.WriteLine(
            $"    result: success={(result.Success ? "true" : "false")}, id={result.TransactionId ?? "-"}, message={result.Message}");
        return result;
    }
}
