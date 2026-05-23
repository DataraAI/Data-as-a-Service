"""Export the current live RoboDataHub category preview selections to JSON."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

CATEGORIES = ("carAutomation", "serverrack", "dexterity", "warehouse")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export the live category preview media manifest for RoboDataHub."
    )
    parser.add_argument(
        "--output",
        default=os.path.join(_BACKEND, "preview-manifests", "category-preview-manifest.json"),
        help="Path to the JSON manifest to write.",
    )
    parser.add_argument(
        "--user-email",
        default="",
        help="Approved user email to use for the preview query. Defaults to the first approved admin.",
    )
    parser.add_argument(
        "--include-private",
        action="store_true",
        help="Include private previews accessible to the export user.",
    )
    return parser.parse_args()


def _pick_export_user(sql_store: Any, requested_email: str) -> dict[str, Any]:
    if requested_email:
        user = sql_store.get_user_by_email(requested_email)
        if not user:
            raise ValueError(f"No user found for email: {requested_email}")
        if not user.get("approved"):
            raise ValueError(f"User is not approved: {requested_email}")
        return user

    users = sql_store.list_users()
    for candidate in users:
        if candidate.get("approved") and candidate.get("role") == "admin":
            return candidate
    for candidate in users:
        if candidate.get("approved"):
            return candidate

    raise ValueError("No approved users were found in the SQL catalog.")


def _repo_media_path(blob_path: str | None) -> str | None:
    if not blob_path:
        return None
    normalized = str(blob_path).strip().replace("\\", "/").lstrip("/")
    if not normalized:
        return None
    return f"dashboard/src/assets/folder-previews/{normalized}"


def _preview_entry(item: dict[str, Any], category: str) -> dict[str, Any]:
    main_image = item.get("main_image") if isinstance(item.get("main_image"), dict) else None
    thumbnails = item.get("thumbnails") if isinstance(item.get("thumbnails"), list) else []
    preview_video = item.get("preview_video") if isinstance(item.get("preview_video"), dict) else None

    thumbnail_blob_paths = [
        str(asset.get("blob_path") or "").strip()
        for asset in thumbnails
        if isinstance(asset, dict) and str(asset.get("blob_path") or "").strip()
    ]

    return {
        "category": category,
        "title": item.get("title"),
        "brand": item.get("brand"),
        "full_path": item.get("full_path"),
        "viewer_path": item.get("viewer_path"),
        "main_image_blob_path": main_image.get("blob_path") if main_image else None,
        "thumbnail_blob_paths": thumbnail_blob_paths,
        "preview_video_blob_path": preview_video.get("blob_path") if preview_video else None,
        "repo_main_image_path": _repo_media_path(main_image.get("blob_path") if main_image else None),
        "repo_thumbnail_paths": [_repo_media_path(blob_path) for blob_path in thumbnail_blob_paths],
        "repo_preview_video_path": _repo_media_path(
            preview_video.get("blob_path") if preview_video else None
        ),
    }


def main() -> None:
    args = parse_args()

    from datara.services.azure_service import AzureService
    from datara.services.dataset_service import DatasetService
    from datara.services.sql_store import SQLStore

    sql_store = SQLStore()
    azure_service = AzureService()
    dataset_service = DatasetService(azure_service, sql_store)
    export_user = _pick_export_user(sql_store, args.user_email)

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "user_email": export_user.get("email"),
        "public_only": not bool(args.include_private),
        "categories": [],
    }

    total_previews = 0
    for category in CATEGORIES:
        previews = dataset_service.list_category_dataset_previews(
            export_user,
            category=category,
            public_only=not bool(args.include_private),
        )
        entries = [_preview_entry(item, category) for item in previews]
        total_previews += len(entries)
        manifest["categories"].append(
            {
                "category": category,
                "count": len(entries),
                "entries": entries,
            }
        )

    output_path = os.path.abspath(os.path.expanduser(args.output))
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    print(f"Wrote {total_previews} category preview entries to {output_path}")


if __name__ == "__main__":
    main()
