import { useState } from "react";
import { CHANNELS, serviceFromConfig, type Channel, type User } from "./notifications.ts";

const USER: User = { name: "Alice", email: "alice@example.com", phone: "+1-555-0100", deviceId: "device-a1b2" };

/**
 * React usage: the selected channel is just configuration state. The component
 * asks the simple factory for a creator and calls its business method `notify`;
 * it never imports or names a concrete notifier.
 */
export default function FactoryMethodDemo() {
  const [channel, setChannel] = useState<Channel>("email");
  const [message, setMessage] = useState("your order #1001 has shipped.");
  const [log, setLog] = useState<string[]>([]);

  const send = () => {
    const service = serviceFromConfig(channel);
    let line: string;
    try {
      line = `${service.name} -> ${service.notify(USER, message)}`;
    } catch (err) {
      line = `${service.name} -> error: ${(err as Error).message}`;
    }
    setLog((previous) => [line, ...previous]);
  };

  return (
    <section>
      <h2>Factory Method — Notification service</h2>
      <label>
        Channel (config){" "}
        <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        Message <input value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: "18rem" }} />
      </label>{" "}
      <button onClick={send}>Notify {USER.name}</button>
      <pre style={{ background: "#f5f5f5", padding: "0.5rem", minHeight: "4rem" }}>
        {log.length ? log.join("\n") : "Nothing sent yet. Try SMS with a long message, or an empty one."}
      </pre>
    </section>
  );
}
