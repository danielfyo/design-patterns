import { describe, expect, it } from "vitest";
import { Bot, ChatRoom, Participant, User } from "./chat.ts";

type Message = [from: string, message: string, isPrivate: boolean];

/** A colleague that records what the room delivers to it. */
class Recorder extends Participant {
  readonly inbox: Message[] = [];

  override receive(from: string, message: string, isPrivate: boolean): void {
    this.inbox.push([from, message, isPrivate]);
  }
}

const roomWith = (...names: string[]) => {
  const log: string[] = [];
  const room = new ChatRoom((line) => log.push(line));
  const members = names.map((name) => new Recorder(name));
  members.forEach((m) => room.register(m));
  return { room, members, log };
};

describe("Mediator: chat room", () => {
  it("broadcasts to everyone except the sender", () => {
    const {
      members: [alice, bob, carol],
    } = roomWith("alice", "bob", "carol");

    alice.send("hi");

    expect(alice.inbox).toEqual([]);
    expect(bob.inbox).toEqual([["alice", "hi", false]]);
    expect(carol.inbox).toEqual([["alice", "hi", false]]);
  });

  it("delivers a direct message only to the named recipient", () => {
    const {
      members: [alice, bob, carol],
    } = roomWith("alice", "bob", "carol");

    bob.sendTo("carol", "lunch?");

    expect(carol.inbox).toEqual([["bob", "lunch?", true]]);
    expect(alice.inbox).toEqual([]);
    expect(bob.inbox).toEqual([]);
  });

  it("lets the room handle an unknown recipient", () => {
    const {
      members: [alice, bob],
      log,
    } = roomWith("alice", "bob");

    alice.sendTo("dave", "there?");

    expect(bob.inbox).toEqual([]);
    expect(log.slice(-2)).toEqual([
      "alice -> dave (private): there?",
      "[room] dave is not in this room",
    ]);
  });

  it("refuses to send before the participant joins a room", () => {
    const loner = new Recorder("loner");

    expect(() => loner.send("hello?")).toThrow("loner has not joined a room.");
    expect(() => loner.sendTo("bob", "hello?")).toThrow(
      "loner has not joined a room.",
    );
  });

  it("lets the bot answer !help privately through the room", () => {
    const {
      room,
      members: [alice, bob, carol],
    } = roomWith("alice", "bob", "carol");
    room.register(new Bot("HelpBot"));

    carol.send(" !help ");

    expect(carol.inbox).toHaveLength(1);
    const [from, message, isPrivate] = carol.inbox[0];
    expect([from, isPrivate]).toEqual(["HelpBot", true]);
    expect(message).toMatch(/^Hi carol!/);
    expect(
      [...alice.inbox, ...bob.inbox].some(([sender]) => sender === "HelpBot"),
    ).toBe(false);
  });

  it("lets the bot ignore ordinary messages", () => {
    const {
      room,
      members: [alice],
    } = roomWith("alice");
    room.register(new Bot("HelpBot"));

    alice.send("help me");

    expect(alice.inbox).toEqual([]);
  });

  it("makes a user print what it receives and tag private messages", () => {
    const lines: string[] = [];
    const log = (line: string) => lines.push(line);
    const room = new ChatRoom(log);
    const alice = new User("alice", log);
    const bob = new User("bob", log);
    room.register(alice);
    room.register(bob);

    alice.send("hi");
    alice.sendTo("bob", "psst");

    expect(lines).toEqual([
      "[room] alice joined",
      "[room] bob joined",
      "alice -> everyone: hi",
      "  [bob] alice: hi",
      "alice -> bob (private): psst",
      "  [bob] alice (private): psst",
    ]);
  });
});
