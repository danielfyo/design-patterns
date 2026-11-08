import { createContext, useContext, useState } from "react";
import { AppConfig } from "./config.ts";

// Captured once when this file is first evaluated; every later read must be the same object.
const firstSeen = AppConfig.instance;

/** A module that grabs the global singleton directly (the classic pattern). */
function ModulePanel({ id }: { id: number }) {
  const config = AppConfig.instance;
  return (
    <li>
      Module #{id}: {config.get("appName")} ({config.get("environment")}) — same instance as the
      first module: <strong>{String(config === firstSeen)}</strong>
    </li>
  );
}

/**
 * The idiomatic React alternative: provide ONE value through context. Components depend on
 * "whatever config the tree gives me", so tests and stories can pass a different one.
 */
const ConfigContext = createContext<AppConfig | null>(null);

function useConfig(): AppConfig {
  const config = useContext(ConfigContext);
  if (!config) throw new Error("useConfig must be used inside <ConfigContext>");
  return config;
}

function MaxConnectionsBadge() {
  const config = useConfig();
  return <span>maxConnections = {config.get("maxConnections")}</span>;
}

export default function SingletonDemo() {
  const [modules, setModules] = useState(2);

  return (
    <section>
      <h2>Singleton — Application configuration</h2>
      <p>
        Every module below reads <code>AppConfig.instance</code>. Mount as many as you like: the
        configuration is loaded only once.
      </p>
      <button onClick={() => setModules((n) => n + 1)}>Mount another module</button>{" "}
      <button onClick={() => setModules((n) => Math.max(1, n - 1))}>Unmount one</button>
      <ul>
        {Array.from({ length: modules }, (_, i) => (
          <ModulePanel key={i} id={i + 1} />
        ))}
      </ul>
      <p>
        Times loaded: <strong>{AppConfig.loadCount}</strong>
      </p>
      <h3>Preferred in React: provide it via context</h3>
      <ConfigContext value={AppConfig.instance}>
        <MaxConnectionsBadge />
      </ConfigContext>
    </section>
  );
}
