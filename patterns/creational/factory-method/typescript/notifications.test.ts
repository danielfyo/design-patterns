import { describe, expect, it } from "vitest";
import {
  CHANNELS,
  EmailService,
  NotificationService,
  PushService,
  SmsNotifier,
  SmsService,
  serviceFromConfig,
  type Notifier,
  type User,
} from "./notifications.ts";

const alice: User = { name: "Alice", email: "alice@example.com", phone: "+1-555-0100", deviceId: "device-a1b2" };

class FakeNotifier implements Notifier {
  send(recipient: User, message: string): string {
    return `FAKE ${recipient.name}: ${message}`;
  }
}

/** A concrete creator defined by the test, to prove notify() only relies on the factory method. */
class RecordingService extends NotificationService {
  readonly name = "RecordingService";
  created = 0;
  protected override createNotifier(): Notifier {
    this.created++;
    return new FakeNotifier();
  }
}

describe("Factory Method: notification service", () => {
  it.each([
    [new EmailService(), "EmailService", 'EMAIL to alice@example.com: "Hi Alice, your order shipped."'],
    [new SmsService(), "SmsService", 'SMS to +1-555-0100: "Hi Alice, your order shipped."'],
    [new PushService(), "PushService", 'PUSH to device-a1b2: "Hi Alice, your order shipped."'],
  ])("each concrete creator delivers through its own product (%#)", (service, name, expected) => {
    expect(service.notify(alice, "your order shipped.")).toBe(expected);
    expect(service.name).toBe(name);
  });

  it("truncates long SMS messages to the maximum length", () => {
    const receipt = new SmsNotifier().send(alice, "a".repeat(40));

    expect(receipt).toBe(`SMS to +1-555-0100: "${"a".repeat(SmsNotifier.maxLength - 3)}..."`);
  });

  it("keeps an SMS message that fits exactly", () => {
    const message = "b".repeat(SmsNotifier.maxLength);

    expect(new SmsNotifier().send(alice, message)).toBe(`SMS to +1-555-0100: "${message}"`);
  });

  it.each(["", "   "])("rejects the blank message %j on every channel", (message) => {
    for (const service of [new EmailService(), new SmsService(), new PushService()]) {
      expect(() => service.notify(alice, message)).toThrow("message must not be empty");
    }
  });

  it("runs the shared business logic with any product a subclass creates", () => {
    const service = new RecordingService();

    expect(service.notify(alice, "hello")).toBe("FAKE Alice: Hi Alice, hello");
    expect(service.created).toBe(1);
  });

  it("does not call the factory method when validation fails", () => {
    const service = new RecordingService();

    expect(() => service.notify(alice, " ")).toThrow();
    expect(service.created).toBe(0);
  });

  it("maps every configured channel name to its creator", () => {
    expect(CHANNELS).toEqual(["email", "sms", "push"]);
    expect(serviceFromConfig("email")).toBeInstanceOf(EmailService);
    expect(serviceFromConfig("sms")).toBeInstanceOf(SmsService);
    expect(serviceFromConfig("push")).toBeInstanceOf(PushService);
  });

  it.each(["fax", "Email", "toString"])("rejects the unknown channel %j", (channel) => {
    expect(() => serviceFromConfig(channel)).toThrow(`unknown notification channel "${channel}"`);
  });
});
