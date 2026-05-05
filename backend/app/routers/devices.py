from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_auth
from app.models.device import Device

router = APIRouter()


@router.get("/devices")
async def list_devices(
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).order_by(Device.updated_at.desc()))
    devices = result.scalars().all()
    return [
        {
            "id": d.id,
            "code": d.code,
            "last_connected_at": d.last_connected_at.isoformat() if d.last_connected_at else None,
            "last_address": d.last_address,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in devices
    ]


@router.post("/devices", status_code=status.HTTP_201_CREATED)
async def create_device(
    body: dict,
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    code = (body.get("code") or "").strip()
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Device code is required")

    existing = await db.execute(select(Device).where(Device.code == code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Device code already exists"
        )

    device = Device(code=code)
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return {
        "id": device.id,
        "code": device.code,
        "last_connected_at": None,
        "last_address": None,
        "created_at": device.created_at.isoformat() if device.created_at else None,
    }


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: int,
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    await db.delete(device)
    await db.commit()
