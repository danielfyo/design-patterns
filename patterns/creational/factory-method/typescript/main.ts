// Run with: npx tsx patterns/creational/factory-method/typescript/main.ts
import {
  EmailService,
  PushService,
  SmsService,
  serviceFromConfig,
  type NotificationService,
  type User,
} from "./notifications.ts";

console.log("=== Factory Method Pattern: Notification service ===");

const alice: User = { name: "Alice", email: "alice@example.com", phone: "+1-555-0100", deviceId: "device-a1b2" };
const bob: User = { name: "Bob", email: "bob@example.com", phone: "+1-555-0199", deviceId: "device-c3d4" };

// Client code: it only knows the abstract creator, never a concrete notifier.
function sendShippingUpdate(service: NotificationService, user: User): void {
  console.log(`  ${service.name.padEnd(12)} -> ${service.notify(user, "your order #1001 has shipped.")}`);
}

console.log("Client code works only with the abstract NotificationService:");
const services: NotificationService[] = [new EmailService(), new SmsService(), new PushService()];
for (const service of services) {
  sendShippingUpdate(service, alice);
}

console.log("Config-driven selection (a simple factory picks the creator):");
for (const channel of ["push", "email", "fax"]) {
  try {
    const service = serviceFromConfig(channel);
    console.log(`  channel=${channel.padEnd(6)} -> ${service.name}`);
    console.log(`    ${service.notify(bob, "your password was changed.")}`);
  } catch (err) {
    console.log(`  channel=${channel.padEnd(6)} -> error: ${(err as Error).message}`);
  }
}

console.log("Shared business rules live in the creator:");
const sms: NotificationService = new SmsService();
try {
  sms.notify(alice, "   ");
} catch (err) {
  console.log(`  ${sms.name.padEnd(12)} -> error: ${(err as Error).message}`);
}
