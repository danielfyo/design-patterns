"""Shared pytest configuration for the Python examples.

Every pattern keeps its code in ``patterns/<category>/<pattern>/python/main.py``. Because all of
them are called ``main``, tests cannot simply ``import main``. Instead they request the
``example`` fixture, which loads the ``main.py`` that sits next to the test file under a unique
module name::

    def test_something(example: ModuleType) -> None:
        calculator = example.ShippingCalculator(example.StandardShipping())
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest


def load_example(test_file: Path) -> ModuleType:
    """Import the ``main.py`` next to ``test_file`` as ``example_<category>_<pattern>``."""
    source = test_file.parent / "main.py"
    pattern_dir = source.parent.parent
    name = f"example_{pattern_dir.parent.name}_{pattern_dir.name}".replace("-", "_")
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, source)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {source}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module  # needed by dataclasses and typing.get_type_hints
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def example(request: pytest.FixtureRequest) -> ModuleType:
    """The pattern module (``main.py``) that belongs to the requesting test file."""
    return load_example(Path(request.path))
