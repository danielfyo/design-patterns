// Run with: npx tsx patterns/behavioral/state/typescript/main.ts
import { Order } from "./order.ts";

console.log("=== State Pattern: Order lifecycle ===");

// Happy path, plus two actions that the current state rejects.
console.log("--- Order #1001: happy path ---");
const first = new Order(1001);
console.log(`Order #${first.id} created [${first.state.name}]`);
first.pay();
first.ship();
first.cancel();
first.deliver();
first.cancel();
console.log(`Order #${first.id} final state: ${first.state.name}`);

// Same actions, different results: the behavior depends on the current state.
console.log("--- Order #1002: cancellation ---");
const second = new Order(1002);
console.log(`Order #${second.id} created [${second.state.name}]`);
second.ship();
second.pay();
second.cancel();
second.deliver();
console.log(`Order #${second.id} final state: ${second.state.name}`);
