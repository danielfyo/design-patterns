namespace DesignPatterns.Facade;

/// <summary>
/// The Facade: one simple entry point for "place an order". It knows which
/// subsystems to call, in which order, and how to undo partial work when a
/// step fails. Clients no longer orchestrate the subsystems themselves.
/// </summary>
public sealed class OrderFacade(
    InventoryService inventory,
    PaymentService payment,
    ShippingService shipping,
    NotificationService notification)
{
    public OrderResult PlaceOrder(Customer customer, IReadOnlyList<OrderItem> items, string cardNumber)
    {
        // 1-2. Check stock and reserve each item; roll back earlier reservations on failure.
        var reserved = new List<OrderItem>();
        foreach (var item in items)
        {
            if (!inventory.IsAvailable(item.Sku, item.Quantity))
            {
                foreach (var r in reserved) inventory.Release(r.Sku, r.Quantity);
                notification.SendEmail(customer.Email, $"Order failed: {item.Sku} is out of stock");
                return new OrderResult(false, 0m, null,
                    $"{item.Sku} is out of stock (requested {item.Quantity}, available {inventory.StockOf(item.Sku)})");
            }
            inventory.Reserve(item.Sku, item.Quantity);
            reserved.Add(item);
        }

        // 3. Charge the card.
        var total = items.Sum(i => inventory.PriceOf(i.Sku) * i.Quantity);
        payment.Charge(cardNumber, total);

        // 4. Create the shipment.
        var tracking = shipping.CreateShipment(customer, items);

        // 5. Tell the customer.
        notification.SendEmail(customer.Email, $"Order confirmed, total ${total:0.00}, tracking {tracking}");
        return new OrderResult(true, total, tracking, null);
    }
}
