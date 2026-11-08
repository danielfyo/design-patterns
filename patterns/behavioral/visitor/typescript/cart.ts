/**
 * Visitor pattern: new operations (tax, shipping, receipt) over a fixed set of
 * cart item types, without touching the item classes.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (VisitorDemo.tsx).
 */

export type Logger = (line: string) => void;

/**
 * Element: every cart item can "accept" a visitor. First half of double
 * dispatch — the call is resolved by the item's runtime type.
 */
export interface CartItem {
  readonly name: string;
  readonly price: number;
  readonly weightKg: number;
  accept(visitor: CartVisitor): void;
}

/** Concrete Element: calls the visitor method that matches its own type. */
export class Book implements CartItem {
  constructor(
    readonly name: string,
    readonly price: number,
    readonly weightKg: number,
  ) {}
  accept(visitor: CartVisitor): void {
    visitor.visitBook(this);
  }
}

/** Concrete Element. */
export class Electronics implements CartItem {
  constructor(
    readonly name: string,
    readonly price: number,
    readonly weightKg: number,
  ) {}
  accept(visitor: CartVisitor): void {
    visitor.visitElectronics(this);
  }
}

/** Concrete Element. */
export class Food implements CartItem {
  constructor(
    readonly name: string,
    readonly price: number,
    readonly weightKg: number,
  ) {}
  accept(visitor: CartVisitor): void {
    visitor.visitFood(this);
  }
}

/**
 * Visitor: one method per concrete element type. Second half of double
 * dispatch — the call is resolved by the visitor's runtime type.
 */
export interface CartVisitor {
  visitBook(book: Book): void;
  visitElectronics(electronics: Electronics): void;
  visitFood(food: Food): void;
}

export const round2 = (amount: number): number => Math.round(amount * 100) / 100;
export const money = (amount: number): string => `$${amount.toFixed(2)}`;

/** Concrete Visitor: prints one receipt line per item and sums the subtotal. */
export class ReceiptPrinter implements CartVisitor {
  total = 0;
  constructor(private readonly log: Logger = console.log) {}

  visitBook(book: Book): void {
    this.print("[Book]", book);
  }
  visitElectronics(electronics: Electronics): void {
    this.print("[Electronics]", electronics);
  }
  visitFood(food: Food): void {
    this.print("[Food]", food);
  }

  private print(label: string, item: CartItem): void {
    this.log(
      `  ${label.padEnd(13)} ${item.name.padEnd(14)} ${money(item.price).padStart(8)}  ${item.weightKg.toFixed(2)}kg`,
    );
    this.total = round2(this.total + item.price);
  }
}

/** Concrete Visitor: VAT depends on the kind of product. */
export class TaxCalculator implements CartVisitor {
  total = 0;
  constructor(private readonly log: Logger = console.log) {}

  visitBook(book: Book): void {
    this.apply(book, "books 4%", 0.04);
  }
  visitElectronics(electronics: Electronics): void {
    this.apply(electronics, "electronics 21%", 0.21);
  }
  visitFood(food: Food): void {
    this.apply(food, "food 10%", 0.1);
  }

  private apply(item: CartItem, label: string, rate: number): void {
    const tax = round2(item.price * rate);
    this.log(`  ${item.name.padEnd(14)} ${label.padEnd(17)} ${money(tax).padStart(8)}`);
    this.total = round2(this.total + tax);
  }
}

/** Concrete Visitor: shipping rules by product type and weight. */
export class ShippingCostCalculator implements CartVisitor {
  total = 0;
  constructor(private readonly log: Logger = console.log) {}

  visitBook(book: Book): void {
    this.add(book, "flat rate", 1.5);
  }
  visitElectronics(electronics: Electronics): void {
    this.add(electronics, "$4.00 + $1.20/kg", 4 + 1.2 * electronics.weightKg);
  }
  visitFood(food: Food): void {
    this.add(food, "$2.50/kg, min $3.00", Math.max(3, 2.5 * food.weightKg));
  }

  private add(item: CartItem, rule: string, cost: number): void {
    const rounded = round2(cost);
    this.log(`  ${item.name.padEnd(14)} ${rule.padEnd(20)} ${money(rounded).padStart(8)}`);
    this.total = round2(this.total + rounded);
  }
}
