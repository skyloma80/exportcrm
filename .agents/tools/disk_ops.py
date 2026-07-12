"""S3 file operations — list, upload, download, delete, batch, sync."""
from __future__ import annotations
import os
from pathlib import Path

from call_api import call_api


def disk_list(path: str) -> list[dict]:
    """List files in a disk directory.

    Args:
        path: Directory path (e.g. "/Company/Customer/Project")

    Returns:
        List of file entries with name, size, modified_at
    """
    return call_api("GET", "api/disk/list", params={"path": path})


def disk_upload(file_path: str, destination: str) -> dict:
    """Upload a local file to S3 storage.

    Args:
        file_path: Local file path on disk
        destination: Destination path on S3 including filename

    Returns:
        Dict with uploaded file info
    """
    import base64
    with open(file_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    filename = file_path.replace("\\", "/").split("/")[-1]
    return call_api("POST", "api/disk/upload", body={
        "path": destination,
        "content": content,
        "filename": filename,
    })


def disk_download(path: str) -> bytes:
    """Download a file from S3 storage.

    Args:
        path: Full file path on S3

    Returns:
        Raw file bytes
    """
    result = call_api("GET", "api/disk/download", params={"path": path})
    import base64
    content = result.get("content", "")
    return base64.b64decode(content) if content else b""


def disk_delete(path: str) -> dict:
    """Delete a file or directory from S3 storage.

    Args:
        path: File or directory path to delete
    """
    return call_api("DELETE", "api/disk/delete", body={"path": path})


def disk_folders() -> list[dict]:
    """Get the full directory tree."""
    return call_api("GET", "api/disk/folders")


def disk_ensure_folder(path: str) -> dict:
    """Create a directory if it doesn't exist."""
    return call_api("POST", "api/disk/ensure-folder", body={"path": path})


def disk_batch_upload(files: list[dict]) -> list[dict]:
    """Upload multiple files to S3.

    Args:
        files: List of {"local_path": str, "destination": str}

    Returns:
        List of upload result dicts, each with "file", "status", "error"
    """
    results = []
    for f in files:
        try:
            result = disk_upload(f["local_path"], f["destination"])
            results.append({"file": f["local_path"], "status": "ok", "result": result})
        except Exception as e:
            results.append({"file": f["local_path"], "status": "error", "error": str(e)})
    return results


def disk_sync(local_dir: str, remote_dir: str, dry_run: bool = False) -> dict:
    """Sync a local directory to S3, preserving structure.

    Args:
        local_dir: Local directory path
        remote_dir: Remote S3 base path
        dry_run: If True, only list what would be uploaded

    Returns:
        Dict with uploaded, skipped, errors lists
    """
    local_path = Path(local_dir)
    if not local_path.is_dir():
        return {"error": f"Local directory not found: {local_dir}"}

    if not dry_run:
        disk_ensure_folder(remote_dir)
    uploaded = []
    skipped = []
    errors = []

    for f in sorted(local_path.rglob("*")):
        if not f.is_file():
            continue
        relative = f.relative_to(local_path).as_posix()
        remote_path = f"{remote_dir.rstrip('/')}/{relative}"

        if dry_run:
            skipped.append({"local": str(f), "remote": remote_path})
            continue

        try:
            result = disk_upload(str(f), remote_path)
            uploaded.append({"local": str(f), "remote": remote_path, "result": result})
        except Exception as e:
            errors.append({"local": str(f), "remote": remote_path, "error": str(e)})

    return {
        "dry_run": dry_run,
        "uploaded": uploaded,
        "skipped": skipped,
        "errors": errors,
    }
