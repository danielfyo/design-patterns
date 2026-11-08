using DesignPatterns.Mediator;

Console.WriteLine("=== Mediator Pattern: Chat room ===");

IChatMediator room = new ChatRoom();
var alice = new User("alice");
var bob = new User("bob");
var carol = new User("carol");

// Participants only get to know the room, never each other.
room.Register(alice);
room.Register(bob);
room.Register(carol);
room.Register(new Bot("HelpBot"));

alice.Send("Hi everyone!");
bob.Send("Welcome, alice!");
carol.Send("!help");                       // the bot reacts through the room
bob.SendTo("carol", "Lunch at 1pm?");
carol.SendTo("bob", "Sure!");
alice.SendTo("dave", "Are you there?");    // the room decides what to do
