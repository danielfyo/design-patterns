// Run with: npx tsx patterns/behavioral/mediator/typescript/main.ts
import { Bot, ChatRoom, User, type ChatMediator } from "./chat.ts";

console.log("=== Mediator Pattern: Chat room ===");

const room: ChatMediator = new ChatRoom();
const alice = new User("alice");
const bob = new User("bob");
const carol = new User("carol");

// Participants only get to know the room, never each other.
room.register(alice);
room.register(bob);
room.register(carol);
room.register(new Bot("HelpBot"));

alice.send("Hi everyone!");
bob.send("Welcome, alice!");
carol.send("!help"); // the bot reacts through the room
bob.sendTo("carol", "Lunch at 1pm?");
carol.sendTo("bob", "Sure!");
alice.sendTo("dave", "Are you there?"); // the room decides what to do
