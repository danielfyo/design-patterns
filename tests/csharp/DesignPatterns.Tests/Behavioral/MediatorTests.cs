using DesignPatterns.Mediator;

namespace DesignPatterns.Tests.Behavioral;

[Collection("Console")]
public sealed class MediatorTests
{
    /// <summary>A colleague that records what the room delivers to it.</summary>
    private sealed class Recorder(string name) : Participant(name)
    {
        public List<(string From, string Message, bool IsPrivate)> Inbox { get; } = [];

        public override void Receive(string from, string message, bool isPrivate) =>
            Inbox.Add((from, message, isPrivate));
    }

    private static (ChatRoom Room, Recorder Alice, Recorder Bob, Recorder Carol) CreateRoom()
    {
        var room = new ChatRoom();
        var alice = new Recorder("alice");
        var bob = new Recorder("bob");
        var carol = new Recorder("carol");
        room.Register(alice);
        room.Register(bob);
        room.Register(carol);
        return (room, alice, bob, carol);
    }

    [Fact]
    public void Broadcast_reaches_everyone_except_the_sender()
    {
        using var console = new ConsoleCapture();
        var (_, alice, bob, carol) = CreateRoom();

        alice.Send("hi");

        Assert.Empty(alice.Inbox);
        Assert.Equal([("alice", "hi", false)], bob.Inbox);
        Assert.Equal([("alice", "hi", false)], carol.Inbox);
    }

    [Fact]
    public void Direct_message_reaches_only_the_named_recipient()
    {
        using var console = new ConsoleCapture();
        var (_, alice, bob, carol) = CreateRoom();

        bob.SendTo("carol", "lunch?");

        Assert.Equal([("bob", "lunch?", true)], carol.Inbox);
        Assert.Empty(alice.Inbox);
        Assert.Empty(bob.Inbox);
    }

    [Fact]
    public void Unknown_recipient_is_handled_by_the_room()
    {
        using var console = new ConsoleCapture();
        var (_, alice, bob, carol) = CreateRoom();

        alice.SendTo("dave", "there?");

        Assert.Empty(bob.Inbox);
        Assert.Empty(carol.Inbox);
        Assert.EndsWith("alice -> dave (private): there?\n[room] dave is not in this room\n", console.Output);
    }

    [Fact]
    public void Participant_cannot_send_before_joining_a_room()
    {
        var loner = new Recorder("loner");

        var error = Assert.Throws<InvalidOperationException>(() => loner.Send("hello?"));
        Assert.Equal("loner has not joined a room.", error.Message);
        Assert.Throws<InvalidOperationException>(() => loner.SendTo("bob", "hello?"));
    }

    [Fact]
    public void Bot_answers_help_privately_through_the_room()
    {
        using var console = new ConsoleCapture();
        var (room, alice, bob, carol) = CreateRoom();
        room.Register(new Bot("HelpBot"));

        carol.Send(" !help ");

        var reply = Assert.Single(carol.Inbox);
        Assert.Equal("HelpBot", reply.From);
        Assert.True(reply.IsPrivate);
        Assert.StartsWith("Hi carol!", reply.Message);
        Assert.DoesNotContain(alice.Inbox, m => m.From == "HelpBot");
        Assert.DoesNotContain(bob.Inbox, m => m.From == "HelpBot");
    }

    [Fact]
    public void Bot_ignores_ordinary_messages()
    {
        using var console = new ConsoleCapture();
        var (room, alice, _, _) = CreateRoom();
        room.Register(new Bot("HelpBot"));

        alice.Send("help me");

        Assert.Empty(alice.Inbox);
    }

    [Fact]
    public void User_prints_what_it_receives_and_tags_private_messages()
    {
        using var console = new ConsoleCapture();
        var room = new ChatRoom();
        var alice = new User("alice");
        var bob = new User("bob");
        room.Register(alice);
        room.Register(bob);

        alice.Send("hi");
        alice.SendTo("bob", "psst");

        Assert.Equal(
            "[room] alice joined\n[room] bob joined\n"
            + "alice -> everyone: hi\n  [bob] alice: hi\n"
            + "alice -> bob (private): psst\n  [bob] alice (private): psst\n",
            console.Output);
    }
}
