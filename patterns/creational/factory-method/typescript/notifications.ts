/**
 * Factory Method pattern: a notification service whose subclasses decide
 * which notifier (product) to create.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (FactoryMethodDemo.tsx).
 */

/** The person we want to reach. Each channel uses a different address. */
export interface User {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly deviceId: string;
}

/** Product: the common interface of everything the factory method can create. */
export interface Notifier {
  send(recipient: User, message: string): string;
}

/** Concrete Product: delivers the message by e-mail. */
export class EmailNotifier implements Notifier {
  send(recipient: User, message: string): string {
    return `EMAIL to ${recipient.email}: "${message}"`;
  }
}

/** Concrete Product: delivers the message by SMS, which has a length limit. */
export class SmsNotifier implements Notifier {
  static readonly maxLength = 32;

  send(recipient: User, message: string): string {
    const max = SmsNotifier.maxLength;
    const text = message.length > max ? `${message.slice(0, max - 3)}...` : message;
    return `SMS to ${recipient.phone}: "${text}"`;
  }
}

/** Concrete Product: delivers the message as a mobile push notification. */
export class PushNotifier implements Notifier {
  send(recipient: User, message: string): string {
    return `PUSH to ${recipient.deviceId}: "${message}"`;
  }
}

/**
 * Creator: declares the factory method `createNotifier()` and contains the
 * business logic (`notify`) that works with whatever product it returns.
 */
export abstract class NotificationService {
  abstract readonly name: string;

  /** The factory method. Subclasses decide which concrete notifier to build. */
  protected abstract createNotifier(): Notifier;

  /** Business logic shared by every channel: validate, personalize, deliver. */
  notify(user: User, message: string): string {
    if (message.trim() === "") {
      throw new Error("message must not be empty");
    }
    const notifier = this.createNotifier();
    return notifier.send(user, `Hi ${user.name}, ${message}`);
  }
}

/** Concrete Creator: returns an EmailNotifier. */
export class EmailService extends NotificationService {
  readonly name = "EmailService";
  protected override createNotifier(): Notifier {
    return new EmailNotifier();
  }
}

/** Concrete Creator: returns an SmsNotifier. */
export class SmsService extends NotificationService {
  readonly name = "SmsService";
  protected override createNotifier(): Notifier {
    return new SmsNotifier();
  }
}

/** Concrete Creator: returns a PushNotifier. */
export class PushService extends NotificationService {
  readonly name = "PushService";
  protected override createNotifier(): Notifier {
    return new PushNotifier();
  }
}

/**
 * NOT the GoF pattern: a "simple factory" that maps a configuration string to a
 * concrete creator. A lookup table of constructors replaces the switch.
 */
const SERVICES = {
  email: EmailService,
  sms: SmsService,
  push: PushService,
} as const satisfies Record<string, new () => NotificationService>;

export type Channel = keyof typeof SERVICES;
export const CHANNELS = Object.keys(SERVICES) as Channel[];

export function serviceFromConfig(channel: string): NotificationService {
  if (!Object.hasOwn(SERVICES, channel)) {
    throw new Error(`unknown notification channel "${channel}"`);
  }
  return new SERVICES[channel as Channel]();
}
