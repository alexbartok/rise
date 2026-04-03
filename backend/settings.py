import json
import os
from pathlib import Path

from typing import Literal

from pydantic import BaseModel

SETTINGS_PATH = Path(os.environ.get("SETTINGS_PATH", Path(__file__).parent.parent / "settings.json"))


class AppSettings(BaseModel):
    timeFormat: Literal["12h", "24h"] = "24h"
    dateFormat: Literal["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] = "DD.MM.YYYY"


class SettingsUpdate(BaseModel):
    timeFormat: Literal["12h", "24h"] | None = None
    dateFormat: Literal["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] | None = None

    @classmethod
    def load(cls):
        if SETTINGS_PATH.exists():
            data = json.loads(SETTINGS_PATH.read_text())
            return cls(**data)
        return cls()

    def save(self):
        SETTINGS_PATH.write_text(json.dumps(self.model_dump(), indent=2) + "\n")
