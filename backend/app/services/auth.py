from app.config import settings


def verify_api_key(api_key: str) -> bool:
    return api_key in settings.api_keys
