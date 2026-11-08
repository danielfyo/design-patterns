namespace DesignPatterns.Mediator;

/// <summary>
/// The Mediator interface: the only thing participants know about. All
/// communication goes through it, so participants never reference each other.
/// </summary>
public interface IChatMediator
{
    void Register(Participant participant);
    void Send(string message, Participant from);
    void SendDirect(string message, Participant from, string to);
}

/// <summary>
/// The Colleague base class: knows its mediator, not the other participants.
/// Recipients of a direct message are addressed by name, not by reference.
/// </summary>
public abstract class Participant(string name)
{
    public string Name { get; } = name;

    /// <summary>Set by the mediator when the participant registers.</summary>
    protected internal IChatMediator? Mediator { get; set; }

    private IChatMediator Room =>
        Mediator ?? throw new InvalidOperationException($"{Name} has not joined a room.");

    public void Send(string message) => Room.Send(message, this);

    public void SendTo(string recipient, string message) => Room.SendDirect(message, this, recipient);

    public abstract void Receive(string from, string message, bool isPrivate);
}

/// <summary>Concrete Colleague: a human user who prints what they receive.</summary>
public sealed class User(string name) : Participant(name)
{
    public override void Receive(string from, string message, bool isPrivate)
    {
        var tag = isPrivate ? " (private)" : "";
        Console.WriteLine($"  [{Name}] {from}{tag}: {message}");
    }
}

/// <summary>
/// Concrete Colleague: a bot that silently listens and answers "!help" with a
/// private message. Adding it required no change to <see cref="User"/>.
/// </summary>
public sealed class Bot(string name) : Participant(name)
{
    public override void Receive(string from, string message, bool isPrivate)
    {
        if (message.Trim() == "!help")
        {
            SendTo(from, $"Hi {from}! Commands: !help. Private messages reach one person only.");
        }
    }
}

/// <summary>
/// Concrete Mediator: owns the list of participants and the routing rules
/// (broadcast, direct messages, unknown recipients).
/// </summary>
public sealed class ChatRoom : IChatMediator
{
    private readonly List<Participant> _participants = [];

    public void Register(Participant participant)
    {
        participant.Mediator = this;
        _participants.Add(participant);
        Console.WriteLine($"[room] {participant.Name} joined");
    }

    public void Send(string message, Participant from)
    {
        Console.WriteLine($"{from.Name} -> everyone: {message}");
        foreach (var participant in _participants.ToArray())
        {
            if (participant != from)
            {
                participant.Receive(from.Name, message, isPrivate: false);
            }
        }
    }

    public void SendDirect(string message, Participant from, string to)
    {
        Console.WriteLine($"{from.Name} -> {to} (private): {message}");
        var recipient = _participants.Find(p => p.Name == to);
        if (recipient is null)
        {
            Console.WriteLine($"[room] {to} is not in this room");
            return;
        }
        recipient.Receive(from.Name, message, isPrivate: true);
    }
}
