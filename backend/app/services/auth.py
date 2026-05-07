from datetime import datetime, timezone
from secrets import token_urlsafe

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.api_key import ApiKey


async def seed_api_keys(db: AsyncSession) -> None:
    result = await db.execute(select(func.count(ApiKey.id)))
    if result.scalar_one() > 0:
        return

    for index, api_key in enumerate(settings.api_keys, start=1):
        db.add(ApiKey(key=api_key, label=f"Default Key {index}"))

    await db.commit()


def generate_api_key() -> str:
    return "ra-" + token_urlsafe(32)


async def verify_api_key(api_key: str, db: AsyncSession, *, touch_last_used: bool = True) -> ApiKey | None:
    result = await db.execute(select(ApiKey).where(ApiKey.key == api_key))
    record = result.scalar_one_or_none()
    if not record:
        return None

    if touch_last_used:
        record.last_used_at = datetime.now(timezone.utc)
        await db.commit()

    return record
