from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict


@dataclass
class LLMSettings:
    base_url: str = ""
    api_key: str = ""
    model: str = ""


class SettingsStore:
    """Persist lightweight application settings to the user configuration directory."""

    def __init__(self, config_path: Path | None = None) -> None:
        self.path = config_path or self._default_path()

    def load(self) -> LLMSettings:
        if not self.path.exists():
            return LLMSettings()

        try:
            data = json.loads(self.path.read_text())
            return LLMSettings(
                base_url=data.get("base_url", ""),
                api_key=data.get("api_key", ""),
                model=data.get("model", ""),
            )
        except (json.JSONDecodeError, OSError):  # pragma: no cover - defensive guard
            return LLMSettings()

    def save(self, settings: LLMSettings) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload: Dict[str, Any] = asdict(settings)
        self.path.write_text(json.dumps(payload, indent=2))

    @staticmethod
    def _default_path() -> Path:
        if os.name == "nt":
            base = Path(os.getenv("APPDATA", Path.home()))
            return base / "Copliot Enigma" / "settings.json"
        return Path.home() / ".config" / "copliot-enigma" / "settings.json"
