"""Structured audit event collector (JSON-oriented).

Ported from the Reporter pattern in api-relay-audit audit.py (MIT).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class JsonRecorder:
    """Collects headings, paragraphs, code blocks, and risk flags."""

    events: list[dict[str, Any]] = field(default_factory=list)
    flags: list[dict[str, str]] = field(default_factory=list)

    def h2(self, t: str) -> None:
        self.events.append({"type": "h2", "text": t})

    def h3(self, t: str) -> None:
        self.events.append({"type": "h3", "text": t})

    def p(self, t: str) -> None:
        self.events.append({"type": "p", "text": t})

    def code(self, t: str, lang: str = "") -> None:
        self.events.append({"type": "code", "lang": lang, "text": t})

    def flag(self, level: str, msg: str) -> None:
        self.flags.append({"level": level, "message": msg})
