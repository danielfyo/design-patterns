/**
 * Mediator pattern: a chat room routes messages between participants.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (MediatorDemo.tsx).
 */

export type Log = (line: string) => void;

/**
 * The Mediator interface: the only thing participants know about. All
 * communication goes through it, so participants never reference each other.
 */
export interface ChatMediator {
  register(participant: Participant): void;
  send(message: string, from: Participant): void;
  sendDirect(message: string, from: Participant, to: string): void;
}

/**
 * The Colleague base class: knows its mediator, not the other participants.
 * Recipients of a direct message are addressed by name, not by reference.
 */
export abstract class Participant {
  /** Set by the mediator when the participant registers. */
  mediator: ChatMediator | null = null;

  constructor(readonly name: string) {}

  private get room(): ChatMediator {
    if (!this.mediator) throw new Error(`${this.name} has not joined a room.`);
    return this.mediator;
  }

  send(message: string): void {
    this.room.send(message, this);
  }

  sendTo(recipient: string, message: string): void {
    this.room.sendDirect(message, this, recipient);
  }

  abstract receive(from: string, message: string, isPrivate: boolean): void;
}

/** Concrete Colleague: a human user who prints what they receive. */
export class User extends Participant {
  constructor(
    name: string,
    private readonly log: Log = console.log,
  ) {
    super(name);
  }

  override receive(from: string, message: string, isPrivate: boolean): void {
    const tag = isPrivate ? " (private)" : "";
    this.log(`  [${this.name}] ${from}${tag}: ${message}`);
  }
}

/**
 * Concrete Colleague: a bot that silently listens and answers "!help" with a
 * private message. Adding it required no change to `User`.
 */
export class Bot extends Participant {
  override receive(from: string, message: string): void {
    if (message.trim() === "!help") {
      this.sendTo(from, `Hi ${from}! Commands: !help. Private messages reach one person only.`);
    }
  }
}

/**
 * Concrete Mediator: owns the list of participants and the routing rules
 * (broadcast, direct messages, unknown recipients).
 */
export class ChatRoom implements ChatMediator {
  readonly #participants: Participant[] = [];

  constructor(private readonly log: Log = console.log) {}

  register(participant: Participant): void {
    participant.mediator = this;
    this.#participants.push(participant);
    this.log(`[room] ${participant.name} joined`);
  }

  send(message: string, from: Participant): void {
    this.log(`${from.name} -> everyone: ${message}`);
    for (const participant of [...this.#participants]) {
      if (participant !== from) participant.receive(from.name, message, false);
    }
  }

  sendDirect(message: string, from: Participant, to: string): void {
    this.log(`${from.name} -> ${to} (private): ${message}`);
    const recipient = this.#participants.find((p) => p.name === to);
    if (!recipient) {
      this.log(`[room] ${to} is not in this room`);
      return;
    }
    recipient.receive(from.name, message, true);
  }
}
