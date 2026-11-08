using DesignPatterns.Strategy;

namespace DesignPatterns.Tests.Behavioral;

public sealed class StrategyTests
{
    private static readonly Order LightOrder = new(Subtotal: 80m, WeightKg: 4m);
    private static readonly Order BigOrder = new(Subtotal: 150m, WeightKg: 4m);

    [Theory]
    [InlineData(typeof(StandardShipping), 11.00)]
    [InlineData(typeof(ExpressShipping), 27.00)]
    [InlineData(typeof(StorePickup), 0.00)]
    public void Each_strategy_prices_the_same_order_differently(Type strategyType, double expected)
    {
        var strategy = (IShippingStrategy)Activator.CreateInstance(strategyType)!;

        Assert.Equal((decimal)expected, strategy.Calculate(LightOrder));
    }

    [Fact]
    public void Free_over_threshold_falls_back_below_the_threshold()
    {
        var strategy = new FreeOverThresholdShipping(100m, new StandardShipping());

        Assert.Equal(11.00m, strategy.Calculate(LightOrder));
        Assert.Equal(0m, strategy.Calculate(BigOrder));
        Assert.Equal("Free over $100", strategy.Name);
    }

    [Fact]
    public void Context_delegates_to_the_strategy_swapped_at_runtime()
    {
        var calculator = new ShippingCalculator(new StandardShipping());
        Assert.Equal(11.00m, calculator.Quote(LightOrder));

        calculator.Strategy = new ExpressShipping();

        Assert.Equal(27.00m, calculator.Quote(LightOrder));
    }

    [Fact]
    public void Context_rejects_a_null_strategy()
    {
        var calculator = new ShippingCalculator(new StandardShipping());

        Assert.Throws<ArgumentNullException>(() => calculator.Strategy = null!);
    }
}
