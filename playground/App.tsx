import { useEffect, useState, type ComponentType } from "react";

/**
 * Discovers every React demo in the repository at build time:
 *   patterns/<category>/<pattern>/typescript/<Name>Demo.tsx  (default export)
 */
const modules = import.meta.glob<{ default: ComponentType }>("../patterns/*/*/typescript/*Demo.tsx", {
  eager: true,
});

interface DemoEntry {
  category: string;
  slug: string;
  title: string;
  Component: ComponentType;
}

const CATEGORY_ORDER = ["creational", "structural", "behavioral"];

const toTitle = (slug: string) =>
  slug
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

const demos: DemoEntry[] = Object.entries(modules)
  .map(([path, mod]) => {
    const [, , category, slug] = path.split("/");
    return { category, slug, title: toTitle(slug), Component: mod.default };
  })
  .sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.title.localeCompare(b.title),
  );

const readHash = () => window.location.hash.replace(/^#\/?/, "");

export default function App() {
  const [current, setCurrent] = useState(() => readHash() || demos[0]?.slug);

  useEffect(() => {
    const onHashChange = () => setCurrent(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const active = demos.find((d) => d.slug === current) ?? demos[0];

  return (
    <div className="layout">
      <nav>
        <h1>Design Patterns</h1>
        <p className="subtitle">React + TypeScript playground</p>
        {CATEGORY_ORDER.map((category) => (
          <div key={category}>
            <h3>{toTitle(category)}</h3>
            <ul>
              {demos
                .filter((d) => d.category === category)
                .map((d) => (
                  <li key={d.slug}>
                    <a href={`#/${d.slug}`} className={d.slug === active?.slug ? "active" : undefined}>
                      {d.title}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <main>
        {active ? (
          <>
            <p className="breadcrumb">
              {toTitle(active.category)} · <code>patterns/{active.category}/{active.slug}</code>
            </p>
            <active.Component key={active.slug} />
          </>
        ) : (
          <p>No demos found.</p>
        )}
      </main>
    </div>
  );
}
