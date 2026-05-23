"""Download frozen RoboDataHub preview media from Azure into the frontend asset tree."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path, PurePosixPath
from typing import Any

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_REPO_ROOT = os.path.dirname(_BACKEND)
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Download the manifest-selected RoboDataHub folder preview images and hover videos "
            "into dashboard/src/assets/folder-previews/<blob_path>."
        )
    )
    parser.add_argument(
        "--manifest",
        default=os.path.join(_BACKEND, "preview-manifests", "category-preview-manifest.json"),
        help="Path to the exported category preview manifest JSON.",
    )
    parser.add_argument(
        "--output-root",
        default=os.path.join(_REPO_ROOT, "dashboard", "src", "assets", "folder-previews"),
        help="Local root where the mirrored preview assets should be written.",
    )
    parser.add_argument(
        "--container-name",
        default="",
        help="Azure Blob container name. Defaults to AZURE_BLOB_CONTAINER/roboteyeview.",
    )
    parser.add_argument(
        "--connection-string",
        default="",
        help="Optional Azure Blob connection string override.",
    )
    parser.add_argument(
        "--category",
        action="append",
        default=[],
        help="Optional category filter. Repeat for multiple categories.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite files that already exist locally.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the files that would be downloaded without writing anything.",
    )
    return parser.parse_args()


def _normalize_blob_path(blob_path: str | None) -> str | None:
    if not blob_path:
        return None
    normalized = str(blob_path).strip().replace("\\", "/").lstrip("/")
    return normalized or None


def _iter_manifest_blob_paths(
    manifest: dict[str, Any],
    category_filters: set[str],
) -> list[str]:
    blob_paths: list[str] = []
    seen: set[str] = set()

    for category_group in manifest.get("categories", []):
        category_name = str(category_group.get("category") or "").strip()
        if category_filters and category_name not in category_filters:
            continue

        for entry in category_group.get("entries", []):
            candidates = [
                entry.get("main_image_blob_path"),
                *(entry.get("thumbnail_blob_paths") or []),
                entry.get("preview_video_blob_path"),
            ]
            for candidate in candidates:
                normalized = _normalize_blob_path(candidate)
                if not normalized or normalized in seen:
                    continue
                seen.add(normalized)
                blob_paths.append(normalized)

    return blob_paths


def _load_manifest(path: str) -> dict[str, Any]:
    manifest_path = Path(path).expanduser().resolve()
    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest, dict):
        raise ValueError(f"Manifest must be a JSON object: {manifest_path}")
    return manifest


def _target_path(output_root: Path, blob_path: str) -> Path:
    return output_root.joinpath(*PurePosixPath(blob_path).parts)


def main() -> None:
    args = parse_args()

    manifest = _load_manifest(args.manifest)
    output_root = Path(args.output_root).expanduser().resolve()
    category_filters = {item.strip() for item in args.category if item.strip()}
    blob_paths = _iter_manifest_blob_paths(manifest, category_filters)

    if not blob_paths:
        raise ValueError("No preview media blob paths were found for the requested manifest/category set.")

    from azure.core.exceptions import ResourceNotFoundError
    from utils import azure_client

    container_client = azure_client.get_blob_container(
        connection_string=args.connection_string or None,
        container_name=args.container_name or None,
    )

    downloaded = 0
    skipped = 0
    missing = 0

    print(f"Resolved {len(blob_paths)} unique preview media blob paths.")
    print(f"Writing into: {output_root}")

    for blob_path in blob_paths:
        destination = _target_path(output_root, blob_path)

        if destination.exists() and not args.overwrite:
            skipped += 1
            print(f"Skipped existing: {destination}")
            continue

        if args.dry_run:
            print(f"[DRY RUN] {blob_path} -> {destination}")
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            payload = container_client.download_blob(blob_path).readall()
        except ResourceNotFoundError:
            missing += 1
            print(f"Missing blob, skipped: {blob_path}")
            continue

        destination.write_bytes(payload)
        downloaded += 1
        print(f"Downloaded: {blob_path} -> {destination}")

    print(
        f"Done. downloaded={downloaded} skipped={skipped} missing={missing} total={len(blob_paths)}"
    )


if __name__ == "__main__":
    main()
