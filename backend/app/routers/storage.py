from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_auth
from app.models.device import Device
from app.services import storage_service
from app.services.auth import verify_api_key

router = APIRouter()


async def _track_device(db: AsyncSession, device_code: str, client_host: str | None):
    result = await db.execute(select(Device).where(Device.code == device_code))
    device = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if device:
        device.last_connected_at = now
        device.last_address = client_host
    else:
        device = Device(
            code=device_code,
            last_connected_at=now,
            last_address=client_host,
        )
        db.add(device)
    await db.commit()


@router.post("/auth/verify")
async def verify_auth(body: dict):
    api_key = body.get("api_key", "")
    if not verify_api_key(api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    return {"success": True, "message": "Authenticated"}


@router.get("/storage")
async def list_dir(
    request: Request,
    path: str = Query("/", description="Directory path"),
    device_code: str | None = Header(None, alias="X-Device-Code"),
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    if device_code:
        await _track_device(db, device_code, request.client.host)

    try:
        return storage_service.list_directory(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except NotADirectoryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except storage_service.PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/storage/content")
async def read_file(
    request: Request,
    path: str = Query(..., description="File path"),
    device_code: str | None = Header(None, alias="X-Device-Code"),
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    if device_code:
        await _track_device(db, device_code, request.client.host)

    try:
        return storage_service.read_file_content(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except storage_service.PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
