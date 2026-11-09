"""Application settings.

All configuration is read from environment variables so that no secrets are
ever committed to the repository. See ``.env.example`` for the full list.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "CampusMate API"
    environment: str = "development"

    # --- Database -----------------------------------------------------------
    # Defaults to a local SQLite file so the project runs with zero setup.
    # docker-compose overrides this with a PostgreSQL + pgvector URL.
    database_url: str = "sqlite:///./campusmate.db"

    # --- Auth ---------------------------------------------------------------
    # CHANGE THIS IN PRODUCTION. Kept here only so the demo runs out of the box.
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 8

    # --- Model adapters -----------------------------------------------------
    # When no API key is configured the app falls back to deterministic,
    # offline implementations so the demo never depends on a paid service.
    llm_provider: str = "stub"  # "stub" | "openai"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""

    embedding_provider: str = "hashing"  # "hashing" | "openai"
    embedding_base_url: str = "https://api.openai.com/v1"
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: str = ""
    embedding_dim: int = 384

    # --- Retrieval ----------------------------------------------------------
    retrieval_top_k: int = 5
    # Minimum hybrid score for a passage to be considered "supporting evidence".
    retrieval_min_score: float = 0.08
    # Minimum fraction of the question's content words a passage must contain to
    # be treated as evidence. Prevents answers built on one incidental word.
    retrieval_min_coverage: float = 0.5

    # --- Uploads ------------------------------------------------------------
    upload_dir: str = "./storage/documents"
    max_upload_mb: int = 20

    # --- CORS ---------------------------------------------------------------
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
