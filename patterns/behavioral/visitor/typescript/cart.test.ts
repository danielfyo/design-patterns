import { describe, expect, it } from "vitest";
import {
  Book,
  Electronics,
  Food,
  ReceiptPrinter,
  ShippingCostCalculator,
  TaxCalculator,
  type CartItem,
  type CartVisitor,
} from "./cart.ts";

const cart = (): CartItem[] => [
  new Book("Clean Code", 32.5, 0.8),
  new Electronics("Headphones", 59.9, 0.4),
  new Food("Coffee beans", 12, 1.5),
  new Electronics("Monitor", 199, 5.5),
  new Food("Chocolate", 3.5, 0.2),
];

const silent = () => {};

function visitAll(visitor: CartVisitor, items: CartItem[]): void {
  for (const item of items) item.accept(visitor);
}

describe("Visitor: shopping cart operations", () => {
  it("dispatches each element to the visit method of its own type", () => {
    const visits: string[] = [];
    const recorder: CartVisitor = {
      visitBook: (b) => visits.push(`book:${b.name}`),
      visitElectronics: (e) => visits.push(`electronics:${e.name}`),
      visitFood: (f) => visits.push(`food:${f.name}`),
    };

    visitAll(recorder, cart());

    expect(visits).toEqual([
      "book:Clean Code",
      "electronics:Headphones",
      "food:Coffee beans",
      "electronics:Monitor",
      "food:Chocolate",
    ]);
  });

  it.each([
    ["book", new Book("Item", 25, 1), 1],
    ["electronics", new Electronics("Item", 25, 1), 5.25],
    ["food", new Food("Item", 25, 1), 2.5],
  ])("applies the %s tax rate", (_, item, expected) => {
    const tax = new TaxCalculator(silent);

    item.accept(tax);

    expect(tax.total).toBe(expected);
  });

  it("rounds tax half up per item", () => {
    const tax = new TaxCalculator(silent);

    visitAll(tax, [new Electronics("Headphones", 59.9, 0.4), new Food("Chocolate", 0.05, 0.1)]);

    expect(tax.total).toBe(12.59);
  });

  it.each([
    [0.2, 3],
    [1.5, 3.75],
  ])("charges food shipping per kg with a minimum (%s kg)", (weight, expected) => {
    const shipping = new ShippingCostCalculator(silent);

    new Food("Food", 1, weight).accept(shipping);

    expect(shipping.total).toBe(expected);
  });

  it("uses a different shipping rule for each element type", () => {
    const shipping = new ShippingCostCalculator(silent);

    new Book("B", 100, 9).accept(shipping);
    expect(shipping.total).toBe(1.5);
    new Electronics("E", 100, 5.5).accept(shipping);

    expect(shipping.total).toBe(12.1);
  });

  it("runs each visitor as a separate operation over the same cart", () => {
    const receipt = new ReceiptPrinter(silent);
    const tax = new TaxCalculator(silent);
    const shipping = new ShippingCostCalculator(silent);

    for (const visitor of [receipt, tax, shipping]) visitAll(visitor, cart());

    expect(receipt.total).toBe(306.9);
    expect(tax.total).toBe(57.22);
    expect(shipping.total).toBe(23.33);
  });

  it("labels each receipt line with the element type", () => {
    const lines: string[] = [];

    visitAll(new ReceiptPrinter((l) => lines.push(l)), [
      new Book("Clean Code", 32.5, 0.8),
      new Food("Chocolate", 3.5, 0.2),
    ]);

    expect(lines).toEqual([
      "  [Book]        Clean Code       $32.50  0.80kg",
      "  [Food]        Chocolate         $3.50  0.20kg",
    ]);
  });
});
