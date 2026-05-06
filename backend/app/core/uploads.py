from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile


UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


async def save_image_upload(file: UploadFile, folder: str) -> str:
    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, GIF, and WebP images are allowed.",
        )

    upload_dir = UPLOAD_ROOT / folder
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4()}{extension}"
    destination = upload_dir / filename

    size = 0
    with destination.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail="Image uploads must be 5MB or smaller.",
                )
            output.write(chunk)

    return f"/uploads/{folder}/{filename}"
