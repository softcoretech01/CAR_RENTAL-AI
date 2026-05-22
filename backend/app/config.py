from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AI_API_KEY: str = ""
    AI_BASE_URL: str = "https://api.groq.com/openai/v1"
    AI_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    DAMAGE_CONFIDENCE_THRESHOLD: float = 65.0
    DAMAGE_IMAGE_MAX_PX: int = 1024
    DAMAGE_STORAGE_DIR: str = "storage/images"

    # MySQL
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "damageai"
    DB_USER: str = "damageai"
    DB_PASS: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()
