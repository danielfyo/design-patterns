using DesignPatterns.Proxy;

Console.WriteLine("=== Proxy Pattern: Document store proxy ===");

var proxy = new DocumentStoreProxy();
IDocumentStore store = proxy;   // the client only sees the Subject interface
Console.WriteLine($"Proxy ready, real store created: {(proxy.IsRealStoreCreated ? "true" : "false")}");

var alice = new User("alice", "editor");
var bob = new User("bob", "viewer");

Request(alice, "doc-1");
Request(bob, "doc-1");
Request(bob, "doc-2");
Request(alice, "doc-2");

Console.WriteLine($"Stats: {proxy.Requests} requests, {proxy.RemoteFetches} remote fetches, real store created: {(proxy.IsRealStoreCreated ? "true" : "false")}");

void Request(User user, string id)
{
    Console.WriteLine($"{user.Name} ({user.Role}) asks for {id}");
    try
    {
        var doc = store.GetDocument(id, user);
        Console.WriteLine($"  -> \"{doc.Title}\" ({doc.Classification})");
    }
    catch (AccessDeniedException ex)
    {
        Console.WriteLine($"  -> access denied: {ex.Message}");
    }
}
