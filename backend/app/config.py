from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    storage_api_keys: str = "sk-admin"
    storage_root: str = "./storage_data"
    database_url: str = "sqlite+aiosqlite:///./radish.db"

    @property
    def api_keys(self) -> list[str]:
        return [k.strip() for k in self.storage_api_keys.split(",") if k.strip()]

    @property
    def resolved_storage_root(self) -> Path:
        return Path(self.storage_root).resolve()


settings = Settings()
