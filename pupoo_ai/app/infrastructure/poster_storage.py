from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import mimetypes
import os
from pathlib import Path
import re
import uuid

import boto3

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.infrastructure.storage import StorageAdapter, StorageReference


_DEFAULT_EXTENSION_BY_CONTENT_TYPE = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def _sanitize_key_part(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip().lower()
    if not cleaned:
        return None
    cleaned = re.sub(r"[^a-z0-9\\-_]+", "-", cleaned)
    cleaned = re.sub(r"-{2,}", "-", cleaned).strip("-")
    return cleaned or None


def _resolve_extension(content_type: str, key_hint: str | None = None) -> str:
    if key_hint:
        suffix = Path(key_hint).suffix.strip()
        if suffix:
            return suffix.lower()
    mapped = _DEFAULT_EXTENSION_BY_CONTENT_TYPE.get(content_type.lower())
    if mapped:
        return mapped
    guessed = mimetypes.guess_extension(content_type)
    if guessed:
        return guessed.lower()
    return ".bin"


def _env_first(*keys: str, default: str = "") -> str:
    for key in keys:
        value = (os.getenv(key) or "").strip()
        if value:
            return value
    return default


def resolve_public_url(storage_key: str) -> str:
    base_url = _env_first("APP_STORAGE_CDN_BASE_URL", "APP_STORAGE_PUBLIC_BASE_URL", default="")
    if not base_url:
        return storage_key
    return f"{base_url.rstrip('/')}/{storage_key.lstrip('/')}"


@dataclass
class PosterObjectStorageAdapter(StorageAdapter):
    base_dir: Path

    def store_generated_file(
        self,
        *,
        content: bytes,
        content_type: str,
        key_hint: str | None = None,
    ) -> StorageReference:
        storage_bucket = _env_first("APP_STORAGE_BUCKET", "STORAGE_S3_BUCKET", "STORAGE_BUCKET", "AWS_S3_BUCKET")
        if storage_bucket:
            return self._store_to_object_storage(
                storage_bucket=storage_bucket,
                content=content,
                content_type=content_type,
                key_hint=key_hint,
            )
        return self._store_to_local(
            content=content,
            content_type=content_type,
            key_hint=key_hint,
        )

    def _store_to_object_storage(
        self,
        *,
        storage_bucket: str,
        content: bytes,
        content_type: str,
        key_hint: str | None,
    ) -> StorageReference:
        storage_region = _env_first("APP_STORAGE_REGION", "STORAGE_S3_REGION", "STORAGE_REGION", "AWS_REGION", default="ap-northeast-2")
        key_prefix = _env_first("APP_STORAGE_KEY_PREFIX", "STORAGE_S3_KEY_PREFIX", "STORAGE_KEY_PREFIX", default="uploads")
        service_endpoint = _env_first("APP_STORAGE_SERVICE_ENDPOINT", "STORAGE_SERVICE_ENDPOINT", default="")
        path_style_access = _env_first("APP_STORAGE_PATH_STYLE_ACCESS", "STORAGE_PATH_STYLE_ACCESS", default="false").lower() == "true"

        storage_key = self._build_storage_key(content_type=content_type, key_hint=key_hint, key_prefix=key_prefix)
        client_kwargs = {"service_name": "s3", "region_name": storage_region}
        if service_endpoint:
            client_kwargs["endpoint_url"] = service_endpoint
        if path_style_access:
            client_kwargs["config"] = boto3.session.Config(s3={"addressing_style": "path"})

        client = boto3.client(**client_kwargs)
        client.put_object(
            Bucket=storage_bucket,
            Key=storage_key,
            Body=content,
            ContentType=content_type,
        )
        return StorageReference(
            key=storage_key,
            internal_path=f"s3://{storage_bucket}/{storage_key}",
        )

    def _store_to_local(
        self,
        *,
        content: bytes,
        content_type: str,
        key_hint: str | None,
    ) -> StorageReference:
        relative_path = Path(self._build_storage_key(content_type=content_type, key_hint=key_hint, key_prefix=""))
        absolute_path = self.base_dir / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content)
        return StorageReference(
            key=str(relative_path).replace("\\", "/"),
            internal_path=str(absolute_path),
        )

    def _build_storage_key(self, *, content_type: str, key_hint: str | None, key_prefix: str) -> str:
        now = datetime.utcnow()
        prefix = Path(settings.poster_storage_prefix) / f"{now.year:04d}" / f"{now.month:02d}"
        safe_hint = _sanitize_key_part(Path(key_hint).stem if key_hint else None)
        filename_base = safe_hint or uuid.uuid4().hex
        extension = _resolve_extension(content_type, key_hint)
        relative_path = prefix / f"{filename_base}{extension}"
        normalized = str(relative_path).replace("\\", "/")
        if key_prefix:
            normalized_prefix = key_prefix.strip("/").replace("\\", "/")
            return f"{normalized_prefix}/{normalized}"
        return normalized
