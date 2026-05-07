from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_auth
from app.models.api_key import ApiKey
from app.services.auth import generate_api_key

router = APIRouter()


def _serialize_api_key(api_key: ApiKey) -> dict:
    return {
        "id": api_key.id,
        "label": api_key.label,
        "key_prefix": f"{api_key.key[:8]}...",
        "last_used_at": api_key.last_used_at.isoformat() if api_key.last_used_at else None,
        "created_at": api_key.created_at.isoformat() if api_key.created_at else None,
        "updated_at": api_key.updated_at.isoformat() if api_key.updated_at else None,
    }


@router.get("/api-keys")
async def list_api_keys(
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ApiKey).order_by(ApiKey.updated_at.desc()))
    api_keys = result.scalars().all()
    return [_serialize_api_key(api_key) for api_key in api_keys]


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: dict,
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    label = (body.get("label") or "").strip()
    key_value = (body.get("key") or "").strip() or generate_api_key()

    if not label:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Label is required")

    existing = await db.execute(select(ApiKey).where(ApiKey.key == key_value))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="API key already exists")

    api_key = ApiKey(key=key_value, label=label, last_used_at=datetime.now(timezone.utc))
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return {"api_key": key_value, "key": _serialize_api_key(api_key)}


@router.delete("/api-keys/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    api_key_id: int,
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count(ApiKey.id)))
    total_keys = total_result.scalar_one()
    if total_keys <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one API key is required")

    result = await db.execute(select(ApiKey).where(ApiKey.id == api_key_id))
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    await db.delete(api_key)
    await db.commit()