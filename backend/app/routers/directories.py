from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_auth
from app.models.directory import Directory
from app.services.storage_service import PathTraversalError, _resolve_safe_path

router = APIRouter()


@router.get("/directories")
async def list_directories(
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Directory).order_by(Directory.path.asc()))
    directories = result.scalars().all()
    return [
        {
            "id": d.id,
            "path": d.path,
            "label": d.label,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in directories
    ]


@router.post("/directories", status_code=status.HTTP_201_CREATED)
async def create_directory(
    body: dict,
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    path = (body.get("path") or "").strip()
    label = (body.get("label") or "").strip()
    if not path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{path} Path is required")

    # Validate path safety and create filesystem directory
    try:
        safe_path = _resolve_safe_path(path)
    except PathTraversalError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path")

    safe_path.mkdir(parents=True, exist_ok=True)

    # Check for duplicate in DB
    existing = await db.execute(select(Directory).where(Directory.path == path))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Directory path already exists")

    directory = Directory(path=path, label=label)
    db.add(directory)
    await db.commit()
    await db.refresh(directory)
    return {
        "id": directory.id,
        "path": directory.path,
        "label": directory.label,
        "created_at": directory.created_at.isoformat() if directory.created_at else None,
    }


@router.put("/directories/{directory_id}")
async def update_directory(
    directory_id: int,
    body: dict,
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Directory).where(Directory.id == directory_id))
    directory = result.scalar_one_or_none()
    if not directory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found")

    label = (body.get("label") or "").strip()
    if not label:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Label is required")

    directory.label = label
    await db.commit()
    await db.refresh(directory)
    return {
        "id": directory.id,
        "path": directory.path,
        "label": directory.label,
        "created_at": directory.created_at.isoformat() if directory.created_at else None,
    }


@router.delete("/directories/{directory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_directory(
    directory_id: int,
    _=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Directory).where(Directory.id == directory_id))
    directory = result.scalar_one_or_none()
    if not directory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found")
    await db.delete(directory)
    await db.commit()
