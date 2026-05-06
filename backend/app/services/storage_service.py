import os
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings

MAX_FILE_PREVIEW = 1024 * 1024  # 1MB


class PathTraversalError(ValueError):
    pass


class StorageEntry:
    def __init__(self, name: str, path: str, entry_type: str, size: int | None, modified: str | None):
        self.name = name
        self.path = path
        self.type = entry_type
        self.size = size
        self.modified = modified

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "path": self.path,
            "type": self.type,
            "size": self.size,
            "modified": self.modified,
        }


def _format_timestamp(ts: float) -> str:
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    return dt.isoformat()


def _resolve_safe_path(request_path: str) -> Path:
    # 词函数实现安全路径解析，防止路径遍历攻击。所有输入路径都被解析为相对于配置的存储根目录，
    # 除非输入路径本身是绝对路径且位于存储根目录之外（例如用户请求了一个挂载的绝对路径）。
    # 在任何情况下，最终解析出的路径都必须存在于存储根目录内，除非它是一个明确的绝外路径。
    # 函数还会清理输入路径，去除查询字符串、片段标识符、前后空白，并拒绝包含null字节的路径。

    root = settings.resolved_storage_root
    # Normalise: strip query strings, collapse slashes, reject null bytes
    clean = request_path.split("?")[0].split("#")[0].strip()
    if "\0" in clean:
        raise PathTraversalError("Invalid path")
    try:
        p = Path(clean)

        # 端口默认路径，直接转到存储根目录
        if clean.startswith("/") or clean.startswith("./") or clean.startswith("../") or clean == ".":
            return (root / clean.lstrip("/")).resolve()

        # 词函数不支持绝对路径
        if p.is_absolute():
            # full = p.resolve()
            raise PathTraversalError("Absolute paths are not allowed")
        
        else:
            full = (root / clean.lstrip("/")).resolve()
            if full != root and root not in full.parents:
                raise PathTraversalError("Path traversal detected")
    except (ValueError, OSError):
        raise PathTraversalError("Invalid path")
    return full


def list_directory(request_path: str) -> dict:
    # 词函数参数强制为相对路径，即主页显示目录为项目下的数据存储目录，至于用户手动挂载的绝对路径需用通过其他接口实现，且不受此函数限制

    safe_path = _resolve_safe_path(request_path)
    if not safe_path.exists():
        raise FileNotFoundError(f"Path not found: {request_path}")
    if not safe_path.is_dir():
        raise NotADirectoryError(f"Not a directory: {request_path}")

    entries: list[StorageEntry] = []
    for child in sorted(safe_path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        stat = child.stat()
        
        # 最小实现
        try:
            display_path = str(child.relative_to(settings.resolved_storage_root)).replace("\\", "/")
            display_path = f"/{display_path}"
        except ValueError:
            display_path = str(child.resolve()).replace("\\", "/")
            if not display_path.startswith("/"):
                display_path = f"/{display_path}"   

        entries.append(
            StorageEntry(
                name=child.name,
                path=display_path,
                entry_type="directory" if child.is_dir() else "file",
                size=stat.st_size if child.is_file() else None,
                modified=_format_timestamp(stat.st_mtime),
            )
        )

    return {
        "path": request_path or "/",
        "name": safe_path.name or "root",
        "entries": [e.to_dict() for e in entries],
    }


def read_file_content(request_path: str) -> dict:
    safe_path = _resolve_safe_path(request_path)
    if not safe_path.exists() or not safe_path.is_file():
        raise FileNotFoundError(f"File not found: {request_path}")

    stat = safe_path.stat()
    try:
        rel = str(safe_path.relative_to(settings.resolved_storage_root)).replace("\\", "/")
        display_path = f"/{rel}"
    except ValueError:
        # Safe path is outside storage root (absolute path requested). Show absolute path.
        display_path = str(safe_path.resolve()).replace("\\", "/")
        if not display_path.startswith("/"):
            display_path = f"/{display_path}"

    # Detect binary: scan first 8192 bytes for null byte
    with open(safe_path, "rb") as f:
        header = f.read(8192)
    if b"\0" in header:
        return {
            "name": safe_path.name,
            "path": display_path,
            "content": None,
            "is_binary": True,
            "truncated": False,
        }

    # Read up to MAX_FILE_PREVIEW
    truncated = stat.st_size > MAX_FILE_PREVIEW
    with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read(MAX_FILE_PREVIEW)

    return {
        "name": safe_path.name,
        "path": display_path,
        "content": content,
        "is_binary": False,
        "truncated": truncated,
    }
