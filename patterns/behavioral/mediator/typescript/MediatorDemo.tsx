import { useRef, useState } from "react";
import { Bot, ChatRoom, User } from "./chat.ts";

const NAMES = ["alice", "bob", "carol"] as const;
const EVERYONE = "*";

/**
 * React usage: the ChatRoom mediator lives for the component's lifetime.
 * Each User writes to its own inbox panel; none of them knows the others.
 * The parent component itself also plays a mediator role: it "lifts state up"
 * so sibling panels communicate through it instead of through each other.
 */
export default function MediatorDemo() {
  const [inboxes, setInboxes] = useState<Record<string, string[]>>({ room: [] });
  const [from, setFrom] = useState<string>("alice");
  const [to, setTo] = useState<string>(EVERYONE);
  const [text, setText] = useState("!help");

  // Built lazily on the first click (an event handler), so that the "joined"
  // log lines are not state updates during render.
  const usersRef = useRef<User[] | null>(null);
  const buildRoom = (): User[] => {
    const append = (key: string) => (line: string) =>
      setInboxes((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), line.trim()] }));
    const room = new ChatRoom(append("room"));
    const created = NAMES.map((name) => new User(name, append(name)));
    created.forEach((u) => room.register(u));
    room.register(new Bot("HelpBot"));
    return created;
  };

  const send = () => {
    usersRef.current ??= buildRoom();
    const sender = usersRef.current.find((u) => u.name === from)!;
    if (to === EVERYONE) sender.send(text);
    else sender.sendTo(to, text);
  };

  return (
    <section>
      <h2>Mediator — Chat room</h2>
      <select value={from} onChange={(e) => setFrom(e.target.value)}>
        {NAMES.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>{" "}
      →{" "}
      <select value={to} onChange={(e) => setTo(e.target.value)}>
        <option value={EVERYONE}>everyone</option>
        {[...NAMES, "dave"].map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>{" "}
      <input value={text} onChange={(e) => setText(e.target.value)} />{" "}
      <button onClick={send}>Send</button>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {["room", ...NAMES].map((key) => (
          <div key={key} style={{ flex: "1 1 160px", border: "1px solid #ccc", padding: 6 }}>
            <strong>{key === "room" ? "Room log (mediator)" : `${key}'s inbox`}</strong>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 12 }}>
              {(inboxes[key] ?? []).join("\n")}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}
