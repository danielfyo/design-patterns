"""Singleton pattern: application configuration loaded exactly once.

Run with:  python3 main.py

The most Pythonic singleton is simply a module-level instance (modules are imported
once and cached in ``sys.modules``). This file is a single script, so it shows the
other common idiom: a thread-safe metaclass that caches the one instance per class.
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Any, ClassVar


class SingletonMeta(type):
    """Metaclass that turns every class using it into a Singleton.

    ``AppConfig()`` goes through ``__call__`` below, which returns the cached instance.
    The lock with a double check makes the first creation thread-safe.
    """

    _instances: ClassVar[dict[type, Any]] = {}
    _lock: ClassVar[threading.Lock] = threading.Lock()

    def __call__(cls, *args: Any, **kwargs: Any) -> Any:
        if cls not in cls._instances:  # fast path, no lock once created
            with cls._lock:
                if cls not in cls._instances:  # double-checked locking
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class AppConfig(metaclass=SingletonMeta):
    """The Singleton: one shared, read-only configuration object."""

    load_count: ClassVar[int] = 0

    def __init__(self) -> None:
        AppConfig.load_count += 1
        # Simulated expensive I/O (reading files, environment variables, a vault...).
        print("[config] loading configuration...")
        self._settings: dict[str, str] = {
            "appName": "Shop API",
            "environment": "production",
            "maxConnections": "20",
            "timeoutSeconds": "30",
        }

    def get(self, key: str) -> str:
        try:
            return self._settings[key]
        except KeyError:
            raise KeyError(f"Unknown setting '{key}'") from None


class DatabaseModule:
    """Client: a module that reads the shared configuration."""

    def __init__(self) -> None:
        self.config = AppConfig()

    def start(self) -> None:
        print(
            f"DatabaseModule: opening pool with maxConnections={self.config.get('maxConnections')}"
            f" ({self.config.get('environment')})"
        )


class ApiModule:
    """Client: another, unrelated module that reads the same configuration."""

    def __init__(self) -> None:
        self.config = AppConfig()

    def start(self) -> None:
        print(
            f'ApiModule: serving "{self.config.get("appName")}"'
            f" with timeoutSeconds={self.config.get('timeoutSeconds')}"
        )


def main() -> None:
    print("=== Singleton Pattern: Application configuration ===")
    print("Booting modules...")

    # Neither module creates its own configuration: both receive the single shared instance.
    database = DatabaseModule()
    api = ApiModule()
    database.start()
    api.start()

    print(f"same instance: {str(database.config is api.config).lower()}")

    print("Settings (read through the shared instance):")
    for key in ("appName", "environment", "maxConnections", "timeoutSeconds"):
        print(f"  {key:<16} = {AppConfig().get(key)}")

    # Thread safety: many threads race for the instance. Results are collected first and
    # printed afterwards, so the output stays deterministic.
    workers = 8
    with ThreadPoolExecutor(max_workers=workers) as pool:
        seen = list(pool.map(lambda _: AppConfig(), range(workers)))

    print(f"{workers} concurrent workers asked for the config...")
    print(f"  distinct instances: {len({id(c) for c in seen})}")
    print(f"  times loaded: {AppConfig.load_count}")


if __name__ == "__main__":
    main()
